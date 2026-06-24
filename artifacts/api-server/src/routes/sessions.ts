import { Router } from "express";
import { db } from "@workspace/db";
import {
  sessionsTable,
  usersTable,
  productSwipesTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import crypto from "crypto";

const router = Router();

// POST /sessions — create a new shared session
router.post("/sessions", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const inviteToken = crypto.randomBytes(16).toString("hex");

  const [session] = await db
    .insert(sessionsTable)
    .values({ createdBy: userId, inviteToken, status: "pending", mode: "decoration" })
    .returning();

  const [creator] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  const origin = (req.headers.origin as string) ?? "";
  const inviteUrl = `${origin}/join/${inviteToken}`;

  res.status(201).json({
    id: session.id,
    status: session.status,
    mode: session.mode,
    inviteToken: session.inviteToken,
    inviteUrl,
    creator,
    partner: null,
  });
});

// GET /sessions/join/:token — join by invite token (must come before /:id)
router.get("/sessions/join/:token", requireAuth, async (req, res) => {
  const { token } = req.params;
  const userId = req.userId!;

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.inviteToken, token));

  if (rows.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = rows[0];

  if (
    session.status === "active" &&
    session.partnerId !== null &&
    session.partnerId !== userId
  ) {
    res.status(409).json({ error: "Session is full" });
    return;
  }

  // If the joining user is not the creator and not already the partner, link them
  if (session.createdBy !== userId && session.partnerId !== userId) {
    await db
      .update(sessionsTable)
      .set({ partnerId: userId, status: "active" })
      .where(eq(sessionsTable.id, session.id));
    session.partnerId = userId;
    session.status = "active";
  }

  const [creator] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, session.createdBy));

  let partner = null;
  if (session.partnerId) {
    const pRows = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, session.partnerId));
    partner = pRows[0] ?? null;
  }

  const origin = (req.headers.origin as string) ?? "";
  const inviteUrl = `${origin}/join/${token}`;

  res.json({
    id: session.id,
    status: session.status,
    mode: session.mode,
    inviteToken: session.inviteToken,
    inviteUrl,
    creator,
    partner,
  });
});

// GET /sessions/:id — get session status and members
router.get("/sessions/:id", requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const userId = req.userId!;

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (rows.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = rows[0];

  if (session.createdBy !== userId && session.partnerId !== userId) {
    res.status(403).json({ error: "Not a member of this session" });
    return;
  }

  const [creator] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, session.createdBy));

  let partner = null;
  if (session.partnerId) {
    const pRows = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, session.partnerId));
    partner = pRows[0] ?? null;
  }

  const origin = (req.headers.origin as string) ?? "";
  const inviteUrl = `${origin}/join/${session.inviteToken}`;

  res.json({
    id: session.id,
    status: session.status,
    mode: session.mode,
    inviteToken: session.inviteToken,
    inviteUrl,
    creator,
    partner,
  });
});

// GET /sessions/:id/matches — products both users liked in this session
router.get("/sessions/:id/matches", requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const userId = req.userId!;

  const rows = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, sessionId));

  if (rows.length === 0) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const session = rows[0];

  if (session.createdBy !== userId && session.partnerId !== userId) {
    res.status(403).json({ error: "Not a member of this session" });
    return;
  }

  if (!session.partnerId) {
    res.json({ products: [], count: 0 });
    return;
  }

  const [creatorSwipes, partnerSwipes] = await Promise.all([
    db
      .select({ productId: productSwipesTable.productId })
      .from(productSwipesTable)
      .where(
        and(
          eq(productSwipesTable.userId, session.createdBy),
          eq(productSwipesTable.sessionId, sessionId),
          eq(productSwipesTable.liked, true)
        )
      ),
    db
      .select({ productId: productSwipesTable.productId })
      .from(productSwipesTable)
      .where(
        and(
          eq(productSwipesTable.userId, session.partnerId),
          eq(productSwipesTable.sessionId, sessionId),
          eq(productSwipesTable.liked, true)
        )
      ),
  ]);

  const creatorSet = new Set(creatorSwipes.map((r) => r.productId));
  const matchIds = partnerSwipes
    .map((r) => r.productId)
    .filter((id) => creatorSet.has(id));

  if (matchIds.length === 0) {
    res.json({ products: [], count: 0 });
    return;
  }

  const products = await db
    .select()
    .from(productsTable)
    .where(inArray(productsTable.id, matchIds));

  res.json({ products, count: products.length });
});

// GET /sessions/:id/registry — identical to /matches; alias for registry mode clarity
router.get("/sessions/:id/registry", requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const userId = req.userId!;

  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
  if (!rows.length) { res.status(404).json({ error: "Session not found" }); return; }
  const session = rows[0];
  if (session.createdBy !== userId && session.partnerId !== userId) {
    res.status(403).json({ error: "Not a member of this session" }); return;
  }
  if (!session.partnerId) { res.json({ products: [], count: 0, pending: [] }); return; }

  const [creatorSwipes, partnerSwipes] = await Promise.all([
    db.select({ productId: productSwipesTable.productId })
      .from(productSwipesTable)
      .where(and(eq(productSwipesTable.userId, session.createdBy), eq(productSwipesTable.sessionId, sessionId), eq(productSwipesTable.liked, true))),
    db.select({ productId: productSwipesTable.productId })
      .from(productSwipesTable)
      .where(and(eq(productSwipesTable.userId, session.partnerId), eq(productSwipesTable.sessionId, sessionId), eq(productSwipesTable.liked, true))),
  ]);

  const creatorSet = new Set(creatorSwipes.map((r) => r.productId));
  const partnerSet = new Set(partnerSwipes.map((r) => r.productId));

  const matchIds = [...creatorSet].filter((id) => partnerSet.has(id));

  // Pending: caller liked but partner has not liked yet
  const callerLikedSet = userId === session.createdBy ? creatorSet : partnerSet;
  const otherLikedSet = userId === session.createdBy ? partnerSet : creatorSet;
  const pendingIds = [...callerLikedSet].filter((id) => !otherLikedSet.has(id));

  const [matchProducts, pendingProducts] = await Promise.all([
    matchIds.length > 0
      ? db.select().from(productsTable).where(inArray(productsTable.id, matchIds))
      : Promise.resolve([]),
    pendingIds.length > 0
      ? db.select().from(productsTable).where(inArray(productsTable.id, pendingIds))
      : Promise.resolve([]),
  ]);

  res.json({ products: matchProducts, count: matchProducts.length, pending: pendingProducts });
});

// PATCH /sessions/:id/mode — set session mode (decoration | registry)
router.patch("/sessions/:id/mode", requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const userId = req.userId!;
  const { mode } = req.body as { mode?: string };

  if (!mode || !["decoration", "registry"].includes(mode)) {
    res.status(400).json({ error: "mode must be decoration or registry" }); return;
  }

  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
  if (!rows.length) { res.status(404).json({ error: "Session not found" }); return; }
  const session = rows[0];
  if (session.createdBy !== userId && session.partnerId !== userId) {
    res.status(403).json({ error: "Not a member of this session" }); return;
  }

  await db.update(sessionsTable).set({ mode }).where(eq(sessionsTable.id, sessionId));
  res.json({ success: true, mode });
});

// GET /sessions/:id/registry/export — plain-text export of mutual registry items
router.get("/sessions/:id/registry/export", requireAuth, async (req, res) => {
  const sessionId = parseInt(req.params.id, 10);
  const userId = req.userId!;

  const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
  if (!rows.length) { res.status(404).json({ error: "Session not found" }); return; }
  const session = rows[0];
  if (session.createdBy !== userId && session.partnerId !== userId) {
    res.status(403).json({ error: "Not a member of this session" }); return;
  }

  const [creator] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, session.createdBy));
  let partnerName = "Partner";
  if (session.partnerId) {
    const [p] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, session.partnerId));
    if (p) partnerName = p.name;
  }

  // Get matched products
  const [creatorSwipes, partnerSwipes] = await Promise.all([
    db.select({ productId: productSwipesTable.productId }).from(productSwipesTable)
      .where(and(eq(productSwipesTable.userId, session.createdBy), eq(productSwipesTable.sessionId, sessionId), eq(productSwipesTable.liked, true))),
    session.partnerId
      ? db.select({ productId: productSwipesTable.productId }).from(productSwipesTable)
          .where(and(eq(productSwipesTable.userId, session.partnerId), eq(productSwipesTable.sessionId, sessionId), eq(productSwipesTable.liked, true)))
      : Promise.resolve([]),
  ]);

  const creatorSet = new Set(creatorSwipes.map((r) => r.productId));
  const matchIds = partnerSwipes.map((r) => r.productId).filter((id) => creatorSet.has(id));
  const products = matchIds.length > 0
    ? await db.select().from(productsTable).where(inArray(productsTable.id, matchIds))
    : [];

  const lines = [
    `StyleSwipe Wedding Registry`,
    `Partners: ${creator?.name ?? "User"} + ${partnerName}`,
    `Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    ``,
    `Registry Items (${products.length}):`,
    ``,
    ...products.map((p, i) =>
      `${i + 1}. ${p.name} — $${p.price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${p.affiliateUrl ? `\n   ${p.affiliateUrl}` : ""}`
    ),
    ``,
    `Generated by StyleSwipe`,
  ];

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.send(lines.join("\n"));
});

export default router;
