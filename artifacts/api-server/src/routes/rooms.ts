import { Router } from "express";
import { db } from "@workspace/db";
import {
  roomAssignmentsTable,
  productSwipesTable,
  productsTable,
  sessionsTable,
} from "@workspace/db/schema";
import { eq, and, or } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

export const PRESET_ROOMS = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Dining Room",
  "Office",
  "Other",
];

// GET /rooms?sessionId=N — get room assignments for current user (+ partner if sessionId provided)
router.get("/rooms", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const sessionId = req.query.sessionId ? Number(req.query.sessionId) : undefined;

  let partnerId: number | undefined;

  if (sessionId) {
    const [session] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);

    if (session && session.status === "active") {
      if (session.createdBy === userId) {
        partnerId = session.partnerId ?? undefined;
      } else if (session.partnerId === userId) {
        partnerId = session.createdBy;
      }
    }
  }

  // Build where clause: user's assignments, optionally include partner's
  const whereClause = partnerId
    ? or(
        eq(roomAssignmentsTable.userId, userId),
        eq(roomAssignmentsTable.userId, partnerId)
      )
    : eq(roomAssignmentsTable.userId, userId);

  const rows = await db
    .select({
      id: roomAssignmentsTable.id,
      room: roomAssignmentsTable.room,
      productId: roomAssignmentsTable.productId,
      ownerId: roomAssignmentsTable.userId,
      product: {
        id: productsTable.id,
        url: productsTable.url,
        name: productsTable.name,
        price: productsTable.price,
        tags: productsTable.tags,
        category: productsTable.category,
        brand: productsTable.brand,
        affiliateUrl: productsTable.affiliateUrl,
      },
    })
    .from(roomAssignmentsTable)
    .innerJoin(productsTable, eq(roomAssignmentsTable.productId, productsTable.id))
    .where(whereClause);

  // Group by room; annotate each item with owner ("me" | "partner")
  const grouped: Record<
    string,
    { id: number; product: (typeof rows)[0]["product"]; owner: "me" | "partner" }[]
  > = {};

  for (const row of rows) {
    if (!grouped[row.room]) grouped[row.room] = [];
    grouped[row.room].push({
      id: row.id,
      product: row.product,
      owner: row.ownerId === userId ? "me" : "partner",
    });
  }

  const rooms = Object.entries(grouped).map(([name, items]) => ({ name, items }));
  res.json({ rooms, presetRooms: PRESET_ROOMS });
});

// POST /rooms/assign — assign a product to a room (custom room names accepted)
router.post("/rooms/assign", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { productId, room } = req.body as { productId?: number; room?: string };

  if (!productId || !room?.trim()) {
    res.status(400).json({ error: "productId and room are required" });
    return;
  }

  // Verify user has liked this product
  const swipes = await db
    .select()
    .from(productSwipesTable)
    .where(
      and(
        eq(productSwipesTable.userId, userId),
        eq(productSwipesTable.productId, Number(productId)),
        eq(productSwipesTable.liked, true)
      )
    )
    .limit(1);

  if (swipes.length === 0) {
    res.status(404).json({ error: "Product not found in your liked items" });
    return;
  }

  // Idempotent: return existing if already assigned
  const existing = await db
    .select()
    .from(roomAssignmentsTable)
    .where(
      and(
        eq(roomAssignmentsTable.userId, userId),
        eq(roomAssignmentsTable.productId, Number(productId)),
        eq(roomAssignmentsTable.room, room.trim())
      )
    )
    .limit(1);

  if (existing.length > 0) {
    res.json({ success: true, id: existing[0].id, already: true });
    return;
  }

  const [assignment] = await db
    .insert(roomAssignmentsTable)
    .values({ userId, productId: Number(productId), room: room.trim() })
    .returning();

  res.status(201).json({ success: true, id: assignment.id });
});

// DELETE /rooms/assign — remove a product from a room
router.delete("/rooms/assign", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { productId, room } = req.body as { productId?: number; room?: string };

  if (!productId || !room?.trim()) {
    res.status(400).json({ error: "productId and room are required" });
    return;
  }

  await db
    .delete(roomAssignmentsTable)
    .where(
      and(
        eq(roomAssignmentsTable.userId, userId),
        eq(roomAssignmentsTable.productId, Number(productId)),
        eq(roomAssignmentsTable.room, room.trim())
      )
    );

  res.json({ success: true });
});

export default router;
