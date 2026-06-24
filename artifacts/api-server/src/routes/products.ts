import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable,
  productSwipesTable,
  styleProfilesTable,
  sessionsTable,
} from "@workspace/db/schema";
import { eq, and, notInArray, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/products/feed", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : null;

  if (sessionId) {
    // Session-aware feed: merge both users' style profiles, exclude session-scoped swipes
    const sessionRows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId));

    const session = sessionRows[0];
    if (!session || (session.createdBy !== userId && session.partnerId !== userId)) {
      res.status(403).json({ error: "Not a member of this session" });
      return;
    }

    const otherUserId =
      session.createdBy === userId ? session.partnerId : session.createdBy;

    // Collect session-scoped swipes from both users (exclude from feed)
    const sessionSwipedRows = await db
      .select({ productId: productSwipesTable.productId })
      .from(productSwipesTable)
      .where(eq(productSwipesTable.sessionId, sessionId));

    const sessionSwipedIds = [...new Set(sessionSwipedRows.map((r) => r.productId))];

    // Merge tag weights from both users by averaging
    const userIds = otherUserId ? [userId, otherUserId] : [userId];
    const profiles = await db
      .select({ tagWeights: styleProfilesTable.tagWeights })
      .from(styleProfilesTable)
      .where(inArray(styleProfilesTable.userId, userIds));

    const tagSums: Record<string, { total: number; count: number }> = {};
    for (const profile of profiles) {
      const weights =
        (profile.tagWeights as Array<{ tag: string; score: number }>) ?? [];
      for (const { tag, score } of weights) {
        if (!tagSums[tag]) tagSums[tag] = { total: 0, count: 0 };
        tagSums[tag].total += score;
        tagSums[tag].count += 1;
      }
    }
    const mergedWeightMap: Record<string, number> = {};
    for (const [tag, { total, count }] of Object.entries(tagSums)) {
      mergedWeightMap[tag] = total / count;
    }

    let candidates;
    if (sessionSwipedIds.length > 0) {
      candidates = await db
        .select()
        .from(productsTable)
        .where(notInArray(productsTable.id, sessionSwipedIds));
    } else {
      candidates = await db.select().from(productsTable);
    }

    const total = candidates.length;
    const scored = candidates.map((p) => ({
      ...p,
      _score: (p.tags ?? []).reduce(
        (s, tag) => s + (mergedWeightMap[tag] ?? 0),
        0
      ),
    }));
    scored.sort((a, b) => b._score - a._score || a.id - b.id);
    const page = scored.slice(offset, offset + limit).map(({ _score, ...p }) => p);

    res.json({ products: page, total });
    return;
  }

  // Standard solo feed (no sessionId)
  const swipedRows = await db
    .select({ productId: productSwipesTable.productId })
    .from(productSwipesTable)
    .where(eq(productSwipesTable.userId, userId));

  const swipedIds = swipedRows.map((r) => r.productId);

  const profileRow = await db
    .select({ tagWeights: styleProfilesTable.tagWeights })
    .from(styleProfilesTable)
    .where(eq(styleProfilesTable.userId, userId))
    .limit(1);

  const rawWeights = (
    profileRow[0]?.tagWeights as Array<{ tag: string; score: number }> | null
  ) ?? [];
  const tagWeightMap: Record<string, number> = {};
  for (const { tag, score } of rawWeights) {
    tagWeightMap[tag] = score;
  }

  let candidates;
  if (swipedIds.length > 0) {
    candidates = await db
      .select()
      .from(productsTable)
      .where(notInArray(productsTable.id, swipedIds));
  } else {
    candidates = await db.select().from(productsTable);
  }

  const total = candidates.length;

  const scored = candidates.map((p) => {
    let score = 0;
    for (const tag of p.tags ?? []) {
      score += tagWeightMap[tag] ?? 0;
    }
    return { ...p, _score: score };
  });

  scored.sort((a, b) => b._score - a._score || a.id - b.id);

  const page = scored.slice(offset, offset + limit).map(({ _score, ...p }) => p);

  res.json({ products: page, total });
});

router.post("/product-swipes", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { productId, liked, sessionId } = req.body as {
    productId?: number;
    liked?: boolean;
    sessionId?: number;
  };

  if (productId === undefined || liked === undefined) {
    res.status(400).json({ error: "productId and liked are required" });
    return;
  }

  // If sessionId is provided, verify the caller is a member of that session
  if (sessionId) {
    const sessionRows = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, Number(sessionId)));

    if (sessionRows.length === 0) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    const session = sessionRows[0];
    if (session.createdBy !== userId && session.partnerId !== userId) {
      res.status(403).json({ error: "Not a member of this session" });
      return;
    }
  }

  const [swipe] = await db
    .insert(productSwipesTable)
    .values({
      userId,
      productId: Number(productId),
      liked: Boolean(liked),
      ...(sessionId ? { sessionId: Number(sessionId) } : {}),
    })
    .returning();

  res.status(201).json({ success: true, swipeId: swipe.id });
});

router.get("/products/board", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;

  // Determine which user IDs to include
  let userIds: number[] = [userId];

  if (sessionId) {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (session && session.status === "active") {
      const partnerId =
        session.createdBy === userId
          ? session.partnerId
          : session.partnerId === userId
          ? session.createdBy
          : null;
      if (partnerId) userIds = [userId, partnerId];
    }
  }

  // Fetch liked products for all relevant users, deduplicated by productId
  const rows = await db
    .select({
      id: productsTable.id,
      url: productsTable.url,
      name: productsTable.name,
      price: productsTable.price,
      tags: productsTable.tags,
      category: productsTable.category,
      brand: productsTable.brand,
      source: productsTable.source,
      affiliateUrl: productsTable.affiliateUrl,
      likedByUserId: productSwipesTable.userId,
    })
    .from(productSwipesTable)
    .innerJoin(productsTable, eq(productSwipesTable.productId, productsTable.id))
    .where(
      and(
        inArray(productSwipesTable.userId, userIds),
        eq(productSwipesTable.liked, true)
      )
    )
    .orderBy(productSwipesTable.createdAt);

  // Deduplicate: one product entry per unique product id, annotated with likedByPartner
  const seen = new Set<number>();
  const products: Array<{
    id: number; url: string; name: string; price: number; tags: string[];
    category: string; brand: string | null; source: string | null;
    affiliateUrl: string | null; likedByPartner: boolean;
  }> = [];

  for (const row of rows) {
    if (!seen.has(row.id)) {
      seen.add(row.id);
      products.push({
        id: row.id, url: row.url, name: row.name, price: row.price,
        tags: row.tags, category: row.category, brand: row.brand,
        source: row.source, affiliateUrl: row.affiliateUrl,
        likedByPartner: row.likedByUserId !== userId,
      });
    } else {
      // A second row means the partner also liked this product
      const existing = products.find((p) => p.id === row.id);
      if (existing && row.likedByUserId !== userId) existing.likedByPartner = true;
    }
  }

  res.json({ products });
});

router.post("/products/import", requireAuth, async (req, res) => {
  const products = req.body as Array<{
    photo_url: string;
    name: string;
    price: number;
    tags: string[];
    category?: string;
    brand?: string;
    affiliateUrl?: string;
  }>;

  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: "body must be a non-empty array of products" });
    return;
  }

  const inserted = await db
    .insert(productsTable)
    .values(
      products.map((p) => ({
        url: p.photo_url,
        name: p.name,
        price: p.price,
        tags: p.tags,
        category: p.category ?? "general",
        brand: p.brand ?? null,
        source: "import",
        affiliateUrl: p.affiliateUrl ?? null,
      }))
    )
    .returning({ id: productsTable.id });

  res.status(201).json({ imported: inserted.length, ids: inserted.map((r) => r.id) });
});

export default router;
