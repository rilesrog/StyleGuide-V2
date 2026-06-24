import { Router } from "express";
import { randomBytes, pbkdf2Sync } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { supabaseAdmin, supabaseAnon } from "../lib/supabase";

const router = Router();

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100_000, 64, "sha256").toString("hex");
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const computed = hashPassword(password, salt);
  return computed === storedHash;
}

router.post("/auth/register", async (req, res) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Name, email and password are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const [user] = await db
    .insert(usersTable)
    .values({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      token,
      passwordHash,
      passwordSalt: salt,
    })
    .returning();

  res.status(201).json({ userId: user.id, name: user.name, email: user.email, token: user.token });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase().trim()))
    .limit(1);

  if (!rows.length) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = rows[0];
  if (!user.passwordHash || !user.passwordSalt) {
    res.status(401).json({ error: "This account uses magic link sign-in. Check your email." });
    return;
  }
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ userId: user.id, name: user.name, email: user.email, token: user.token });
});

// POST /auth/magic-link — send a Supabase magic link email
router.post("/auth/magic-link", async (req, res) => {
  const { email, redirectTo } = req.body as { email?: string; redirectTo?: string };

  if (!email?.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const { error } = await supabaseAnon.auth.signInWithOtp({
    email: email.toLowerCase().trim(),
    options: {
      ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
    },
  });

  if (error) {
    console.error("Supabase magic link error:", error);
    res.status(500).json({ error: "Failed to send magic link. Please try again." });
    return;
  }

  res.json({ success: true });
});

// POST /auth/supabase-verify — verify Supabase access_token and return our session token
router.post("/auth/supabase-verify", async (req, res) => {
  const { access_token } = req.body as { access_token?: string };

  if (!access_token) {
    res.status(400).json({ error: "access_token is required" });
    return;
  }

  const { data: { user: supaUser }, error } = await supabaseAdmin.auth.getUser(access_token);

  if (error || !supaUser?.email) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const email = supaUser.email.toLowerCase();
  const supabaseId = supaUser.id;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing.length) {
    const user = existing[0];
    if (!user.supabaseId) {
      await db.update(usersTable).set({ supabaseId }).where(eq(usersTable.id, user.id));
    }
    res.json({ userId: user.id, name: user.name, email: user.email, token: user.token });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const name = email.split("@")[0];

  const [newUser] = await db
    .insert(usersTable)
    .values({ name, email, token, supabaseId })
    .returning();

  res.status(201).json({ userId: newUser.id, name: newUser.name, email: newUser.email, token: newUser.token });
});

// GET /users/me — return current user info including mode
router.get("/users/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, mode: usersTable.mode })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!rows.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(rows[0]);
});

// PATCH /users/me/mode — update current user's active mode
router.patch("/users/me/mode", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { mode } = req.body as { mode?: string };
  if (!mode || !["decoration", "registry"].includes(mode)) {
    res.status(400).json({ error: "mode must be decoration or registry" });
    return;
  }
  await db.update(usersTable).set({ mode }).where(eq(usersTable.id, userId));
  res.json({ success: true, mode });
});

export default router;
