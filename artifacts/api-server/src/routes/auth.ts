import { Router } from "express";
import { randomBytes, pbkdf2Sync } from "crypto";
import { db } from "@workspace/db";
import { usersTable, magicLinkTokensTable } from "@workspace/db/schema";
import { eq, and, gt, isNull } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const router = Router();

function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100_000, 64, "sha256").toString("hex");
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  return hashPassword(password, salt) === storedHash;
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

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
  if (existing.length) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const salt = generateSalt();
  const passwordHash = hashPassword(password, salt);

  const [user] = await db.insert(usersTable).values({
    name: name.trim(), email: email.toLowerCase().trim(), token, passwordHash, passwordSalt: salt,
  }).returning();

  res.status(201).json({ userId: user.id, name: user.name, email: user.email, token: user.token });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password?.trim()) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
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

// GET /auth/callback — bounce page served from API, reads ?token= and redirects into the Expo app
router.get("/auth/callback", (req, res) => {
  const expoWebUrl = process.env.REPLIT_EXPO_DEV_DOMAIN
    ? `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`
    : "";

  const tokenParam = req.query.token as string | undefined;

  if (tokenParam && expoWebUrl) {
    res.redirect(`${expoWebUrl}/?magic_token=${encodeURIComponent(tokenParam)}`);
    return;
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Signing in to StyleSwipe...</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; flex-direction: column;
           align-items: center; justify-content: center; height: 100vh; margin: 0;
           background: #fff; gap: 12px; }
    p { color: #555; font-size: 16px; margin: 0; }
  </style>
</head>
<body>
  <p>Sign-in link is missing or expired. Please request a new one.</p>
</body>
</html>`);
});

// POST /auth/magic-link — generate our own token and send via Resend
router.post("/auth/magic-link", async (req, res) => {
  const { email } = req.body as { email?: string };

  if (!email?.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const normalEmail = email.toLowerCase().trim();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(magicLinkTokensTable).values({ email: normalEmail, token, expiresAt });

  const apiBase = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "";
  const magicLink = `${apiBase}/api/auth/callback?token=${token}`;

  // On Resend free tier (no verified domain), emails can only go to the account owner.
  // Set RESEND_TO_OVERRIDE=your@email.com to test; remove once a domain is verified.
  const toAddress = process.env.RESEND_TO_OVERRIDE || normalEmail;

  const { error: emailError } = await resend.emails.send({
    from: "StyleSwipe <onboarding@resend.dev>",
    to: toAddress,
    subject: "Your StyleSwipe sign-in link",
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;">
        <h1 style="font-size:28px;font-weight:700;color:#111;margin-bottom:8px;">StyleSwipe</h1>
        <p style="color:#555;font-size:16px;line-height:24px;margin-bottom:32px;">
          Tap the button below to sign in. This link expires in 1 hour.
        </p>
        <a href="${magicLink}"
           style="display:inline-block;background:#111;color:#fff;text-decoration:none;
                  padding:14px 28px;border-radius:10px;font-size:16px;font-weight:500;">
          Sign in to StyleSwipe
        </a>
        <p style="color:#999;font-size:13px;margin-top:32px;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (emailError) {
    console.error("Resend error:", emailError);
    res.status(500).json({ error: "Failed to send email. Please try again." });
    return;
  }

  res.json({ success: true });
});

// POST /auth/magic-verify — exchange our magic token for an app session
router.post("/auth/magic-verify", async (req, res) => {
  const { token } = req.body as { token?: string };

  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const rows = await db
    .select()
    .from(magicLinkTokensTable)
    .where(
      and(
        eq(magicLinkTokensTable.token, token),
        gt(magicLinkTokensTable.expiresAt, new Date()),
        isNull(magicLinkTokensTable.usedAt)
      )
    )
    .limit(1);

  if (!rows.length) {
    res.status(401).json({ error: "This link has expired or already been used." });
    return;
  }

  const magicRow = rows[0];
  await db.update(magicLinkTokensTable).set({ usedAt: new Date() }).where(eq(magicLinkTokensTable.id, magicRow.id));

  const email = magicRow.email;
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (existing.length) {
    const user = existing[0];
    res.json({ userId: user.id, name: user.name, email: user.email, token: user.token });
    return;
  }

  const sessionToken = randomBytes(32).toString("hex");
  const name = email.split("@")[0];
  const [newUser] = await db.insert(usersTable).values({ name, email, token: sessionToken }).returning();

  res.status(201).json({ userId: newUser.id, name: newUser.name, email: newUser.email, token: newUser.token });
});

// GET /users/me
router.get("/users/me", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const rows = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, mode: usersTable.mode })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!rows.length) { res.status(404).json({ error: "User not found" }); return; }
  res.json(rows[0]);
});

// PATCH /users/me/mode
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
