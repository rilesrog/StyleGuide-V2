import { Router } from "express";
import { db } from "@workspace/db";
import { stylePhotosTable, swipesTable } from "@workspace/db/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

router.get("/style-photos", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;

  const swipedPhotoIds = await db
    .select({ photoId: swipesTable.photoId })
    .from(swipesTable)
    .where(eq(swipesTable.userId, userId));

  const swipedIds = swipedPhotoIds.map((s) => s.photoId);

  const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(stylePhotosTable);
  const total = totalResult[0]?.count ?? 0;

  let photos;
  if (swipedIds.length > 0) {
    photos = await db
      .select()
      .from(stylePhotosTable)
      .where(notInArray(stylePhotosTable.id, swipedIds))
      .limit(limit)
      .offset(offset);
  } else {
    photos = await db.select().from(stylePhotosTable).limit(limit).offset(offset);
  }

  res.json({ photos, total });
});

router.post("/swipes", requireAuth, async (req, res) => {
  const userId = req.userId!;
  const { photoId, liked } = req.body as { photoId?: number; liked?: boolean };

  if (photoId === undefined || liked === undefined) {
    res.status(400).json({ error: "photoId and liked are required" });
    return;
  }

  const [swipe] = await db.insert(swipesTable).values({
    userId,
    photoId: Number(photoId),
    liked: Boolean(liked),
  }).returning();

  res.status(201).json({ success: true, swipeId: swipe.id });
});

router.get("/style-profile", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const likedPhotos = await db
    .select({ tags: stylePhotosTable.tags })
    .from(swipesTable)
    .innerJoin(stylePhotosTable, eq(swipesTable.photoId, stylePhotosTable.id))
    .where(and(eq(swipesTable.userId, userId), eq(swipesTable.liked, true)));

  const totalSwipesResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(swipesTable)
    .where(eq(swipesTable.userId, userId));

  const totalSwipes = totalSwipesResult[0]?.count ?? 0;
  const likedCount = likedPhotos.length;

  const tagCounts: Record<string, number> = {};
  for (const { tags } of likedPhotos) {
    for (const tag of tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const tagWeights = Object.entries(tagCounts)
    .map(([tag, count]) => ({
      tag,
      count,
      score: likedCount > 0 ? count / likedCount : 0,
    }))
    .sort((a, b) => b.score - a.score);

  const topTags = tagWeights.slice(0, 5).map((t) => t.tag);

  res.json({ topTags, tagWeights, totalSwipes, likedCount });
});

router.get("/style-board", requireAuth, async (req, res) => {
  const userId = req.userId!;

  const photos = await db
    .select({
      id: stylePhotosTable.id,
      url: stylePhotosTable.url,
      tags: stylePhotosTable.tags,
      source: stylePhotosTable.source,
    })
    .from(swipesTable)
    .innerJoin(stylePhotosTable, eq(swipesTable.photoId, stylePhotosTable.id))
    .where(and(eq(swipesTable.userId, userId), eq(swipesTable.liked, true)))
    .orderBy(swipesTable.createdAt);

  res.json({ photos });
});

export default router;
