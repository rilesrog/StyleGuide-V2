import { Router } from "express";
import { db } from "@workspace/db";
import { stylePhotosTable, swipesTable, styleProfilesTable, usersTable } from "@workspace/db/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// ─── Tag taxonomy ────────────────────────────────────────────────────────────

type ColorEntry = { name: string; hex: string };

const COLOR_MAP: Record<string, ColorEntry[]> = {
  minimalist:    [{ name: "Crisp White", hex: "#F7F5F3" }, { name: "Soft Greige", hex: "#CAC1B5" }],
  scandinavian:  [{ name: "Warm White", hex: "#F5F1EC" }, { name: "Light Ash", hex: "#D4CFC9" }],
  japandi:       [{ name: "Stone", hex: "#B5AFA9" }, { name: "Warm Sand", hex: "#D9C5A0" }],
  industrial:    [{ name: "Charcoal", hex: "#3D3D3D" }, { name: "Slate", hex: "#6B7280" }],
  bohemian:      [{ name: "Terracotta", hex: "#C4784A" }, { name: "Amber", hex: "#D4956A" }],
  farmhouse:     [{ name: "Antique White", hex: "#F2EDE4" }, { name: "Sage", hex: "#9BAF8E" }],
  rustic:        [{ name: "Warm Sand", hex: "#D4B896" }, { name: "Bark Brown", hex: "#7C5C3D" }],
  coastal:       [{ name: "Sea Mist", hex: "#B8D4E3" }, { name: "Sandy Beige", hex: "#DDD0B8" }],
  "mid-century": [{ name: "Mustard", hex: "#C9A227" }, { name: "Walnut", hex: "#7C5C3D" }],
  maximalist:    [{ name: "Deep Teal", hex: "#2D5A6B" }, { name: "Rich Gold", hex: "#C49A2A" }],
  eclectic:      [{ name: "Plum", hex: "#7B5B8A" }, { name: "Copper", hex: "#B87333" }],
  "art-deco":    [{ name: "Champagne", hex: "#D4AF6A" }, { name: "Deep Emerald", hex: "#1B4D3E" }],
  contemporary:  [{ name: "Cool White", hex: "#F0F0F0" }, { name: "Mid Gray", hex: "#9E9E9E" }],
  warm:          [{ name: "Warm Ivory", hex: "#F5EDD6" }, { name: "Terracotta", hex: "#C4784A" }],
  neutral:       [{ name: "Greige", hex: "#CAC1B5" }, { name: "Off White", hex: "#F2EDE6" }],
  dark:          [{ name: "Charcoal", hex: "#2C2C2C" }, { name: "Slate Blue", hex: "#3D4F6B" }],
  cozy:          [{ name: "Warm Beige", hex: "#D9C5A0" }, { name: "Rust", hex: "#B5541B" }],
  colorful:      [{ name: "Peacock", hex: "#2C7873" }, { name: "Coral", hex: "#E8785A" }],
  natural:       [{ name: "Clay", hex: "#A87050" }, { name: "Moss", hex: "#6B7C4D" }],
  retro:         [{ name: "Mustard", hex: "#C9A227" }, { name: "Avocado", hex: "#7D9B4B" }],
  glamorous:     [{ name: "Champagne", hex: "#D4AF6A" }, { name: "Blush", hex: "#E8C4C0" }],
};

const MATERIALS_MAP: Record<string, string[]> = {
  minimalist:    ["Polished Concrete", "Glass"],
  scandinavian:  ["Oak", "Wool", "Birch"],
  japandi:       ["Bamboo", "Natural Stone", "Linen"],
  industrial:    ["Raw Steel", "Exposed Brick", "Reclaimed Wood"],
  bohemian:      ["Rattan", "Macramé", "Woven Textiles"],
  farmhouse:     ["Shiplap", "Reclaimed Wood", "Cotton"],
  rustic:        ["Reclaimed Wood", "Stone", "Leather"],
  coastal:       ["Rattan", "Linen", "Sisal"],
  "mid-century": ["Teak", "Leather", "Molded Plastic"],
  maximalist:    ["Velvet", "Mixed Metals", "Rich Fabrics"],
  eclectic:      ["Mixed Metals", "Velvet", "Rattan"],
  "art-deco":    ["Marble", "Brass", "Velvet"],
  contemporary:  ["Lacquered Wood", "Steel", "Corian"],
  wood:          ["Reclaimed Wood", "Natural Wood"],
  textured:      ["Bouclé", "Woven Textiles", "Sisal"],
  natural:       ["Natural Stone", "Unfinished Wood", "Linen"],
  warm:          ["Wool", "Leather", "Terracotta Tile"],
  cozy:          ["Bouclé", "Sherpa", "Natural Wood"],
  glamorous:     ["Marble", "Brass", "Crystal"],
  retro:         ["Teak", "Leather", "Molded Plastic"],
};

const STYLE_TAGS_MAP: Record<string, string[]> = {
  minimalist:    ["Clean Lines", "Uncluttered", "Intentional", "Calm"],
  scandinavian:  ["Hygge", "Functional", "Cozy", "Understated"],
  japandi:       ["Wabi-sabi", "Serene", "Mindful", "Grounded"],
  industrial:    ["Raw", "Edgy", "Urban", "Unconventional"],
  bohemian:      ["Free-spirited", "Layered", "Global", "Expressive"],
  farmhouse:     ["Welcoming", "Timeless", "Comfortable", "Down-to-earth"],
  rustic:        ["Natural", "Warm", "Grounded", "Authentic"],
  coastal:       ["Breezy", "Relaxed", "Light-filled", "Effortless"],
  "mid-century": ["Retro-chic", "Organic Forms", "Nostalgic", "Iconic"],
  maximalist:    ["Expressive", "Collected", "Layered", "Bold"],
  eclectic:      ["Curated", "Personal", "Story-driven", "Unique"],
  "art-deco":    ["Glamorous", "Geometric", "Luxurious", "Dramatic"],
  contemporary:  ["Fresh", "Current", "Sophisticated", "Effortless"],
  warm:          ["Inviting", "Snug", "Warmth", "Comfort"],
  cozy:          ["Hygge", "Snug", "Inviting"],
  bold:          ["Statement-making", "Confident", "Dramatic"],
  airy:          ["Light-filled", "Spacious", "Open"],
  zen:           ["Peaceful", "Balanced", "Meditative"],
  serene:        ["Calm", "Tranquil", "Peaceful"],
  natural:       ["Organic", "Earthy", "Sustainable"],
  colorful:      ["Vibrant", "Playful", "Joyful"],
  glamorous:     ["Luxurious", "Opulent", "Sophisticated"],
  retro:         ["Nostalgic", "Vintage", "Playful"],
  vintage:       ["Nostalgic", "Timeless", "Collected"],
  artistic:      ["Creative", "Expressive", "Original"],
  plants:        ["Biophilic", "Fresh", "Living Spaces"],
};

interface StyleResult {
  colorPalette: ColorEntry[];
  materials: string[];
  styleTags: string[];
}

// Returns true only for colors with visible hue — not near-black, near-white, or gray
function isChromatic(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const max = Math.max(r, g, b);
  const saturation = max === 0 ? 0 : (max - Math.min(r, g, b)) / max;
  return luminance > 0.18 && luminance < 0.87 && saturation > 0.12;
}

// Fallback pools used to pad results to minimum cardinality
const FALLBACK_COLORS: ColorEntry[] = [
  { name: "Terracotta",  hex: "#C4784A" },
  { name: "Sage",        hex: "#7D9B6A" },
  { name: "Warm Rust",   hex: "#B5541B" },
  { name: "Ocean",       hex: "#4A7C8B" },
];
const FALLBACK_MATERIALS = ["Natural Wood", "Linen", "Cotton", "Stone", "Wool", "Ceramic"];
const FALLBACK_STYLE_TAGS = ["Timeless", "Comfortable", "Inviting", "Layered", "Natural", "Considered", "Calm", "Personal", "Warm", "Effortless"];

function deriveStyleResult(tagCounts: Record<string, number>): StyleResult {
  const sorted = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const seenColors = new Set<string>();
  const colorPalette: ColorEntry[] = [];
  const seenMaterials = new Set<string>();
  const materials: string[] = [];
  const seenStyleTags = new Set<string>();
  const styleTags: string[] = [];

  for (const tag of sorted) {
    for (const c of COLOR_MAP[tag] ?? []) {
      if (!seenColors.has(c.hex) && colorPalette.length < 4 && isChromatic(c.hex)) {
        seenColors.add(c.hex);
        colorPalette.push(c);
      }
    }
    for (const m of MATERIALS_MAP[tag] ?? []) {
      if (!seenMaterials.has(m) && materials.length < 6) {
        seenMaterials.add(m);
        materials.push(m);
      }
    }
    for (const s of STYLE_TAGS_MAP[tag] ?? []) {
      if (!seenStyleTags.has(s) && styleTags.length < 10) {
        seenStyleTags.add(s);
        styleTags.push(s);
      }
    }
  }

  // Enforce minimum cardinalities: 4 colors, 4 materials, 6 style tags
  for (const c of FALLBACK_COLORS) {
    if (colorPalette.length >= 4) break;
    if (!seenColors.has(c.hex)) { seenColors.add(c.hex); colorPalette.push(c); }
  }
  for (const m of FALLBACK_MATERIALS) {
    if (materials.length >= 4) break;
    if (!seenMaterials.has(m)) { seenMaterials.add(m); materials.push(m); }
  }
  for (const s of FALLBACK_STYLE_TAGS) {
    if (styleTags.length >= 6) break;
    if (!seenStyleTags.has(s)) { seenStyleTags.add(s); styleTags.push(s); }
  }

  return { colorPalette, materials, styleTags };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// ─── POST /api/photos/import ─────────────────────────────────────────────────
// Admin/seed endpoint: bulk-insert curated style photos.
// Body: { photos: Array<{ url: string; tags: string[]; source?: string }> }
// Skips photos whose URL already exists in the DB (idempotent).
//
// Access control:
//   - Development (NODE_ENV !== 'production'): open (no auth required).
//   - Production with SEED_SECRET set: requires "Authorization: Bearer <secret>".
//   - Production without SEED_SECRET set: always returns 403 (disabled).
//
// Usage example (development):
//   curl -X POST http://localhost:8080/api/photos/import \
//     -H "Content-Type: application/json" \
//     -d '{"photos":[{"url":"https://...","tags":["minimalist","neutral"]}]}'
//
// Usage example (production with SEED_SECRET):
//   curl -X POST https://<host>/api/photos/import \
//     -H "Authorization: Bearer $SEED_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"photos":[{"url":"https://...","tags":["minimalist","neutral"]}]}'
router.post("/photos/import", async (req, res) => {
  const importSecret = process.env.SEED_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !importSecret) {
    res.status(403).json({ error: "Import endpoint is disabled in production. Set SEED_SECRET to enable it." });
    return;
  }

  if (importSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${importSecret}`) {
      res.status(401).json({ error: "Invalid or missing Authorization header" });
      return;
    }
  }
  const { photos } = req.body as {
    photos?: Array<{ url?: string; tags?: string[]; source?: string }>;
  };

  if (!Array.isArray(photos) || photos.length === 0) {
    res.status(400).json({ error: "photos array is required and must be non-empty" });
    return;
  }

  const valid = photos.filter(
    (p) => typeof p.url === "string" && p.url.trim() && Array.isArray(p.tags) && p.tags.length >= 2
  );

  if (valid.length === 0) {
    res.status(400).json({ error: "No valid photos: each must have a url and at least 2 tags" });
    return;
  }

  const existingRows = await db.select({ url: stylePhotosTable.url }).from(stylePhotosTable);
  const existingUrls = new Set(existingRows.map((r) => r.url));

  const newPhotos = valid.filter((p) => !existingUrls.has(p.url!.trim()));

  if (newPhotos.length === 0) {
    res.json({ inserted: 0, skipped: valid.length, message: "All photos already exist" });
    return;
  }

  const inserted = await db
    .insert(stylePhotosTable)
    .values(
      newPhotos.map((p) => ({
        url: p.url!.trim(),
        tags: p.tags!,
        source: p.source ?? "curated",
      }))
    )
    .returning({ id: stylePhotosTable.id });

  res.status(201).json({
    inserted: inserted.length,
    skipped: valid.length - inserted.length,
    message: `Imported ${inserted.length} photos`,
  });
});

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

  const [swipe] = await db
    .insert(swipesTable)
    .values({ userId, photoId: Number(photoId), liked: Boolean(liked) })
    .returning();

  await persistStyleProfile(userId);

  res.status(201).json({ success: true, swipeId: swipe.id });
});

router.delete("/swipes", requireAuth, async (req, res) => {
  const userId = req.userId!;
  await db.delete(swipesTable).where(eq(swipesTable.userId, userId));
  await db.delete(styleProfilesTable).where(eq(styleProfilesTable.userId, userId));
  res.json({ success: true });
});

// DELETE /swipes/dislikes — clear only disliked swipes so those photos re-enter the quiz pool
router.delete("/swipes/dislikes", requireAuth, async (req, res) => {
  const userId = req.userId!;
  await db.delete(swipesTable).where(
    and(eq(swipesTable.userId, userId), eq(swipesTable.liked, false))
  );
  res.json({ success: true });
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

  const userRows = await db
    .select({ quizCompletedAt: usersTable.quizCompletedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const profileRows = await db
    .select({ styleResult: styleProfilesTable.styleResult })
    .from(styleProfilesTable)
    .where(eq(styleProfilesTable.userId, userId))
    .limit(1);

  const totalSwipes = totalSwipesResult[0]?.count ?? 0;
  const likedCount = likedPhotos.length;
  const quizCompleted = !!userRows[0]?.quizCompletedAt;
  const styleResult = profileRows[0]?.styleResult ?? null;

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

  res.json({ topTags, tagWeights, totalSwipes, likedCount, quizCompleted, styleResult });
});

router.post("/style-profile/complete", requireAuth, async (req, res) => {
  const userId = req.userId!;

  // One-time only: reject if already completed
  const existingUser = await db
    .select({ quizCompletedAt: usersTable.quizCompletedAt })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (existingUser[0]?.quizCompletedAt) {
    res.status(409).json({ error: "Quiz already completed" });
    return;
  }

  const likedPhotos = await db
    .select({ tags: stylePhotosTable.tags })
    .from(swipesTable)
    .innerJoin(stylePhotosTable, eq(swipesTable.photoId, stylePhotosTable.id))
    .where(and(eq(swipesTable.userId, userId), eq(swipesTable.liked, true)));

  const likedCount = likedPhotos.length;
  const tagCounts: Record<string, number> = {};
  for (const { tags } of likedPhotos) {
    for (const tag of tags ?? []) {
      tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
    }
  }

  const styleResult = deriveStyleResult(tagCounts);

  await db
    .insert(styleProfilesTable)
    .values({ userId, tagWeights: tagCounts, styleResult })
    .onConflictDoUpdate({
      target: styleProfilesTable.userId,
      set: { styleResult, updatedAt: new Date() },
    });

  await db
    .update(usersTable)
    .set({ quizCompletedAt: new Date() })
    .where(eq(usersTable.id, userId));

  res.json({ success: true, styleResult });
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

async function persistStyleProfile(userId: number) {
  const likedPhotos = await db
    .select({ tags: stylePhotosTable.tags })
    .from(swipesTable)
    .innerJoin(stylePhotosTable, eq(swipesTable.photoId, stylePhotosTable.id))
    .where(and(eq(swipesTable.userId, userId), eq(swipesTable.liked, true)));

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

  await db
    .insert(styleProfilesTable)
    .values({ userId, tagWeights })
    .onConflictDoUpdate({
      target: styleProfilesTable.userId,
      set: { tagWeights, updatedAt: new Date() },
    });
}

export default router;
