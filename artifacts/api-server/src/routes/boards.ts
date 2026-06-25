import { Router } from "express";
import { db } from "@workspace/db";
import {
  boardsTable,
  boardItemsTable,
  productsTable,
} from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// Ensure the user's default "Saved" board exists, returning its id
async function ensureDefaultBoard(userId: number): Promise<number> {
  const existing = await db
    .select({ id: boardsTable.id })
    .from(boardsTable)
    .where(and(eq(boardsTable.userId, userId), eq(boardsTable.isDefault, true)))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const [board] = await db
    .insert(boardsTable)
    .values({ userId, name: "Saved", isDefault: true })
    .returning({ id: boardsTable.id });

  return board.id;
}

export { ensureDefaultBoard };

// GET /boards — list all boards for the current user, with item count and thumbnails
router.get("/boards", requireAuth, async (req, res) => {
  const userId = req.userId!;

  await ensureDefaultBoard(userId);

  const boards = await db
    .select({
      id: boardsTable.id,
      name: boardsTable.name,
      isDefault: boardsTable.isDefault,
      createdAt: boardsTable.createdAt,
    })
    .from(boardsTable)
    .where(eq(boardsTable.userId, userId))
    .orderBy(boardsTable.createdAt);

  const enriched = await Promise.all(
    boards.map(async (b) => {
      const itemRows = await db
        .select({ url: productsTable.url })
        .from(boardItemsTable)
        .innerJoin(productsTable, eq(boardItemsTable.productId, productsTable.id))
        .where(eq(boardItemsTable.boardId, b.id))
        .orderBy(boardItemsTable.createdAt)
        .limit(4);

      const countRow = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(boardItemsTable)
        .where(eq(boardItemsTable.boardId, b.id));

      return {
        ...b,
        itemCount: countRow[0]?.count ?? 0,
        thumbnails: itemRows.map((r) => r.url),
      };
    })
  );

  // Default board first, then others sorted by creation
  const sorted = [
    ...enriched.filter((b) => b.isDefault),
    ...enriched.filter((b) => !b.isDefault),
  ];

  res.json({ boards: sorted });
});

// POST /boards — create a new named board
router.post("/boards", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [board] = await db
    .insert(boardsTable)
    .values({ userId, name: name.trim(), isDefault: false })
    .returning();

  res.status(201).json({ board: { id: board.id, name: board.name, isDefault: board.isDefault } });
});

// GET /boards/:id/items — products saved in a board
router.get("/boards/:id/items", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const boardId = Number(req.params.id);

  if (Number.isNaN(boardId)) {
    res.status(400).json({ error: "Invalid board id" });
    return;
  }

  const [board] = await db
    .select({ id: boardsTable.id, userId: boardsTable.userId })
    .from(boardsTable)
    .where(eq(boardsTable.id, boardId))
    .limit(1);

  if (!board || board.userId !== userId) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  const rows = await db
    .select({
      id: productsTable.id,
      url: productsTable.url,
      name: productsTable.name,
      price: productsTable.price,
      tags: productsTable.tags,
      category: productsTable.category,
      brand: productsTable.brand,
      affiliateUrl: productsTable.affiliateUrl,
    })
    .from(boardItemsTable)
    .innerJoin(productsTable, eq(boardItemsTable.productId, productsTable.id))
    .where(eq(boardItemsTable.boardId, boardId))
    .orderBy(boardItemsTable.createdAt);

  res.json({ products: rows });
});

// POST /boards/:id/items — add a product to a board
router.post("/boards/:id/items", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const boardId = Number(req.params.id);
  const { productId } = req.body as { productId?: number };

  if (Number.isNaN(boardId) || !productId) {
    res.status(400).json({ error: "boardId and productId are required" });
    return;
  }

  const [board] = await db
    .select({ id: boardsTable.id, userId: boardsTable.userId })
    .from(boardsTable)
    .where(eq(boardsTable.id, boardId))
    .limit(1);

  if (!board || board.userId !== userId) {
    res.status(404).json({ error: "Board not found" });
    return;
  }

  // Prevent duplicates
  const existing = await db
    .select({ id: boardItemsTable.id })
    .from(boardItemsTable)
    .where(
      and(eq(boardItemsTable.boardId, boardId), eq(boardItemsTable.productId, productId))
    )
    .limit(1);

  if (existing.length === 0) {
    await db.insert(boardItemsTable).values({ boardId, productId: Number(productId) });
  }

  res.json({ success: true });
});

export default router;
