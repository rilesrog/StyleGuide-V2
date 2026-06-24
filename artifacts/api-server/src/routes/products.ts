import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, productSwipesTable, styleProfilesTable } from "@workspace/db/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/products/feed", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

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

  const tagWeights: Record<string, number> =
    (profileRow[0]?.tagWeights as Record<string, number> | null) ?? {};

  // Fetch all unswiped products so ranking and pagination are stable
  // (offset over a filtered set would skip products as swipes accumulate)
  let candidates;
  if (swipedIds.length > 0) {
    candidates = await db
      .select()
      .from(productsTable)
      .where(notInArray(productsTable.id, swipedIds));
  } else {
    candidates = await db.select().from(productsTable);
  }

  // total reflects the unswiped candidate count, not the full catalog size
  const total = candidates.length;

  const scored = candidates.map((p) => {
    let score = 0;
    for (const tag of p.tags ?? []) {
      score += tagWeights[tag] ?? 0;
    }
    return { ...p, _score: score };
  });

  scored.sort((a, b) => b._score - a._score || a.id - b.id);

  const page = scored.slice(offset, offset + limit).map(({ _score, ...p }) => p);

  res.json({ products: page, total });
});

router.post("/product-swipes", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { productId, liked } = req.body as { productId?: number; liked?: boolean };

  if (productId === undefined || liked === undefined) {
    res.status(400).json({ error: "productId and liked are required" });
    return;
  }

  const [swipe] = await db
    .insert(productSwipesTable)
    .values({ userId, productId: Number(productId), liked: Boolean(liked) })
    .returning();

  res.status(201).json({ success: true, swipeId: swipe.id });
});

router.get("/products/board", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const products = await db
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
    })
    .from(productSwipesTable)
    .innerJoin(productsTable, eq(productSwipesTable.productId, productsTable.id))
    .where(and(eq(productSwipesTable.userId, userId), eq(productSwipesTable.liked, true)))
    .orderBy(productSwipesTable.createdAt);

  res.json({ products });
});

router.post("/products/import", requireAuth, async (req, res) => {
  const { products } = req.body as {
    products?: Array<{
      photo_url: string;
      name: string;
      price: number;
      tags: string[];
      category?: string;
      brand?: string;
      affiliateUrl?: string;
    }>;
  };

  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: "products array is required" });
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
