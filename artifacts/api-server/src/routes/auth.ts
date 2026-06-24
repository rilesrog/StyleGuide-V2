import { Router } from "express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const { name, email } = req.body as { name?: string; email?: string };
  if (!name?.trim() || !email?.trim()) {
    res.status(400).json({ error: "Name and email are required" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
  if (existing.length) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const token = randomBytes(32).toString("hex");
  const [user] = await db.insert(usersTable).values({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    token,
  }).returning();

  res.status(201).json({ userId: user.id, name: user.name, email: user.email, token: user.token });
});

router.post("/auth/login", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: "Email is required" });
    return;
  }

  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim())).limit(1);
  if (!rows.length) {
    res.status(404).json({ error: "No account found with that email" });
    return;
  }

  const user = rows[0];
  res.json({ userId: user.id, name: user.name, email: user.email, token: user.token });
});

export default router;
