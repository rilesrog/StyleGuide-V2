import { db } from "@workspace/db";
import { stylePhotosTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const SEED_PHOTOS = [
  // === MINIMALIST ===
  { url: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80", tags: ["minimalist", "contemporary", "neutral", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80", tags: ["minimalist", "contemporary", "neutral", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&q=80", tags: ["minimalist", "contemporary", "bright", "airy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80", tags: ["minimalist", "scandinavian", "white", "clean"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80", tags: ["minimalist", "contemporary", "serene", "neutral"], source: "curated" },

  // === SCANDINAVIAN ===
  { url: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80", tags: ["scandinavian", "minimalist", "cozy", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80", tags: ["scandinavian", "minimalist", "neutral", "clean"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800&q=80", tags: ["scandinavian", "contemporary", "warm", "neutral"], source: "curated" },

  // === JAPANDI ===
  { url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80", tags: ["japandi", "minimalist", "zen", "neutral"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80", tags: ["japandi", "minimalist", "natural", "calm"], source: "curated" },

  // === INDUSTRIAL ===
  { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80", tags: ["industrial", "contemporary", "dark", "urban"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", tags: ["industrial", "dark", "contemporary", "bold"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560185893-a55a5592f2e6?w=800&q=80", tags: ["industrial", "modern", "neutral", "open"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80", tags: ["industrial", "eclectic", "bold", "artistic"], source: "curated" },

  // === BOHEMIAN ===
  { url: "https://images.unsplash.com/photo-1617104424032-b11f58c576ea?w=800&q=80", tags: ["bohemian", "colorful", "warm", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", tags: ["bohemian", "warm", "textured", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80", tags: ["bohemian", "colorful", "plants", "eclectic"], source: "curated" },

  // === FARMHOUSE ===
  { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", tags: ["farmhouse", "rustic", "white", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1484101680937-0a33f0d7e1d3?w=800&q=80", tags: ["farmhouse", "rustic", "cozy", "neutral"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800&q=80", tags: ["farmhouse", "rustic", "wood", "warm"], source: "curated" },

  // === CONTEMPORARY ===
  { url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80", tags: ["contemporary", "modern", "neutral", "clean"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", tags: ["contemporary", "modern", "warm", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80", tags: ["contemporary", "bold", "colorful", "modern"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80", tags: ["contemporary", "neutral", "minimalist", "modern"], source: "curated" },

  // === COASTAL ===
  { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80", tags: ["coastal", "bright", "airy", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1484154218671-7de820ebbd0a?w=800&q=80", tags: ["coastal", "rustic", "neutral", "relaxed"], source: "curated" },

  // === MID-CENTURY MODERN ===
  { url: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&q=80", tags: ["mid-century", "retro", "warm", "vintage"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1565538787857-d7eb85d02b3a?w=800&q=80", tags: ["mid-century", "retro", "contemporary", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80", tags: ["mid-century", "warm", "textured", "retro"], source: "curated" },

  // === MAXIMALIST / ECLECTIC ===
  { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", tags: ["maximalist", "bold", "colorful", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=800&q=80", tags: ["maximalist", "eclectic", "artistic", "colorful"], source: "curated" },

  // === RUSTIC ===
  { url: "https://images.unsplash.com/photo-1506974210756-8e1b8985d348?w=800&q=80", tags: ["rustic", "warm", "natural", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", tags: ["rustic", "warm", "wood", "farmhouse"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600121848594-d8644e57abcd?w=800&q=80", tags: ["rustic", "bohemian", "plants", "natural"], source: "curated" },

  // === ART DECO / GLAM ===
  { url: "https://images.unsplash.com/photo-1618221195710-611aab6fc620?w=800&q=80", tags: ["art-deco", "glamorous", "bold", "luxe"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=800&q=80", tags: ["art-deco", "maximalist", "dramatic", "bold"], source: "curated" },
];

export async function seedStylePhotos() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(stylePhotosTable);
  if (existing[0]?.count > 0) {
    return;
  }

  await db.insert(stylePhotosTable).values(
    SEED_PHOTOS.map((p) => ({
      url: p.url,
      tags: p.tags,
      source: p.source,
    }))
  );

  console.log(`Seeded ${SEED_PHOTOS.length} style photos`);
}
