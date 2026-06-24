import { Router } from "express";
import { randomBytes, pbkdf2Sync } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

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
  if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ userId: user.id, name: user.name, email: user.email, token: user.token });
});

export default router;
