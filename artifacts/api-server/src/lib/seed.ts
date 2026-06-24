import { db } from "@workspace/db";
import { stylePhotosTable, productsTable } from "@workspace/db/schema";
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

const SEED_PRODUCTS = [
  // === SEATING ===
  { name: "Aria Linen Sofa", url: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80", price: 1299, tags: ["minimalist", "scandinavian", "neutral"], category: "seating", brand: "West Elm" },
  { name: "Wren Velvet Armchair", url: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=600&q=80", price: 699, tags: ["maximalist", "art-deco", "bold"], category: "seating", brand: "CB2" },
  { name: "Oak Accent Chair", url: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80", price: 449, tags: ["minimalist", "japandi", "natural"], category: "seating", brand: "Article" },
  { name: "Rattan Papasan Chair", url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80", price: 299, tags: ["bohemian", "coastal", "natural"], category: "seating", brand: "World Market" },
  { name: "Industrial Counter Stool", url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", price: 229, tags: ["industrial", "contemporary", "urban"], category: "seating", brand: "Restoration Hardware" },
  { name: "Japandi Floor Cushion", url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=600&q=80", price: 149, tags: ["japandi", "minimalist", "zen"], category: "seating", brand: "Muji" },
  { name: "Boho Hanging Chair", url: "https://images.unsplash.com/photo-1617104424032-b11f58c576ea?w=600&q=80", price: 249, tags: ["bohemian", "eclectic", "relaxed"], category: "seating", brand: "Urban Outfitters" },
  { name: "Mid-Century Lounge Chair", url: "https://images.unsplash.com/photo-1565538787857-d7eb85d02b3a?w=600&q=80", price: 849, tags: ["mid-century", "retro", "warm"], category: "seating", brand: "Joybird" },
  { name: "Sheepskin Accent Chair", url: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80", price: 599, tags: ["scandinavian", "rustic", "cozy"], category: "seating", brand: "Crate & Barrel" },
  { name: "Chesterfield Loveseat", url: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=600&q=80", price: 1899, tags: ["maximalist", "art-deco", "luxe"], category: "seating", brand: "Arhaus" },

  // === LIGHTING ===
  { name: "Matte Black Cage Pendant", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80", price: 149, tags: ["industrial", "contemporary", "bold"], category: "lighting", brand: "Schoolhouse" },
  { name: "Rattan Wicker Pendant", url: "https://images.unsplash.com/photo-1484154218671-7de820ebbd0a?w=600&q=80", price: 129, tags: ["coastal", "bohemian", "natural"], category: "lighting", brand: "Serena & Lily" },
  { name: "Brass Arc Floor Lamp", url: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&q=80", price: 399, tags: ["mid-century", "art-deco", "warm"], category: "lighting", brand: "Rejuvenation" },
  { name: "Ceramic Mushroom Table Lamp", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80", price: 189, tags: ["japandi", "minimalist", "organic"], category: "lighting", brand: "Anthropologie" },
  { name: "Beaded Chandelier", url: "https://images.unsplash.com/photo-1618221195710-611aab6fc620?w=600&q=80", price: 549, tags: ["maximalist", "bohemian", "glamorous"], category: "lighting", brand: "Currey & Company" },
  { name: "Concrete Table Lamp", url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=600&q=80", price: 89, tags: ["industrial", "minimalist", "urban"], category: "lighting", brand: "Menu" },
  { name: "Macrame Pendant Light", url: "https://images.unsplash.com/photo-1600121848594-d8644e57abcd?w=600&q=80", price: 99, tags: ["bohemian", "farmhouse", "natural"], category: "lighting", brand: "Etsy" },

  // === TABLES ===
  { name: "Live Edge Coffee Table", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&q=80", price: 899, tags: ["rustic", "farmhouse", "natural"], category: "tables", brand: "EQ3" },
  { name: "Marble Side Table", url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=80", price: 349, tags: ["contemporary", "art-deco", "luxe"], category: "tables", brand: "CB2" },
  { name: "Mid-Century Coffee Table", url: "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=600&q=80", price: 649, tags: ["mid-century", "contemporary", "retro"], category: "tables", brand: "Joybird" },
  { name: "Hairpin Leg Console", url: "https://images.unsplash.com/photo-1560185893-a55a5592f2e6?w=600&q=80", price: 449, tags: ["industrial", "mid-century", "urban"], category: "tables", brand: "Blu Dot" },
  { name: "Rattan Round Side Table", url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80", price: 249, tags: ["coastal", "bohemian", "natural"], category: "tables", brand: "World Market" },
  { name: "Walnut Dining Table", url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80", price: 1499, tags: ["scandinavian", "japandi", "natural"], category: "tables", brand: "Room & Board" },

  // === STORAGE ===
  { name: "Open Walnut Bookshelf", url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80", price: 699, tags: ["scandinavian", "japandi", "minimalist"], category: "storage", brand: "Floyd" },
  { name: "Industrial Pipe Shelf", url: "https://images.unsplash.com/photo-1506974210756-8e1b8985d348?w=600&q=80", price: 299, tags: ["industrial", "rustic", "urban"], category: "storage", brand: "Pottery Barn" },
  { name: "Mid-Century Credenza", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80", price: 1199, tags: ["mid-century", "contemporary", "retro"], category: "storage", brand: "Article" },
  { name: "Woven Seagrass Basket Set", url: "https://images.unsplash.com/photo-1484101680937-0a33f0d7e1d3?w=600&q=80", price: 79, tags: ["coastal", "farmhouse", "natural"], category: "storage", brand: "Threshold" },
  { name: "Bamboo Ladder Shelf", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80", price: 189, tags: ["japandi", "minimalist", "natural"], category: "storage", brand: "Muji" },

  // === ART & MIRRORS ===
  { name: "Abstract Canvas Print", url: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=600&q=80", price: 349, tags: ["contemporary", "maximalist", "artistic"], category: "art", brand: "Society6" },
  { name: "Antique Gold Arch Mirror", url: "https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=600&q=80", price: 499, tags: ["art-deco", "maximalist", "glamorous"], category: "art", brand: "Anthropologie" },
  { name: "Macrame Wall Hanging", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80", price: 149, tags: ["bohemian", "farmhouse", "handmade"], category: "art", brand: "Etsy" },
  { name: "Minimalist Line Art Set", url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80", price: 199, tags: ["minimalist", "scandinavian", "contemporary"], category: "art", brand: "Desenio" },
  { name: "Oversized Round Mirror", url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80", price: 399, tags: ["contemporary", "minimalist", "modern"], category: "art", brand: "West Elm" },

  // === TEXTILES ===
  { name: "Moroccan Berber Rug 5x8", url: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=600&q=80", price: 599, tags: ["bohemian", "maximalist", "textured"], category: "textiles", brand: "Beni Rugs" },
  { name: "Jute Natural Area Rug", url: "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=600&q=80", price: 329, tags: ["farmhouse", "coastal", "natural"], category: "textiles", brand: "Dash & Albert" },
  { name: "Velvet Throw Pillow Set", url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=80", price: 89, tags: ["maximalist", "contemporary", "luxe"], category: "textiles", brand: "Parachute" },
  { name: "Woven Cotton Throw", url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80", price: 129, tags: ["scandinavian", "farmhouse", "cozy"], category: "textiles", brand: "Faribault" },
  { name: "Vintage Turkish Rug 4x6", url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80", price: 849, tags: ["bohemian", "eclectic", "maximalist"], category: "textiles", brand: "Oushak Rugs" },
  { name: "Linen Curtain Set", url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=600&q=80", price: 179, tags: ["minimalist", "japandi", "airy"], category: "textiles", brand: "Pottery Barn" },
  { name: "Sheepskin Accent Rug", url: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=600&q=80", price: 279, tags: ["scandinavian", "rustic", "cozy"], category: "textiles", brand: "UGG" },

  // === PLANTS & POTS ===
  { name: "Large Terracotta Planter", url: "https://images.unsplash.com/photo-1600121848594-d8644e57abcd?w=600&q=80", price: 89, tags: ["contemporary", "farmhouse", "natural"], category: "plants", brand: "Terrain" },
  { name: "Sculptural Concrete Pot", url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=600&q=80", price: 129, tags: ["minimalist", "industrial", "modern"], category: "plants", brand: "Ferm Living" },
  { name: "Wicker Plant Stand Set", url: "https://images.unsplash.com/photo-1617104424032-b11f58c576ea?w=600&q=80", price: 99, tags: ["bohemian", "coastal", "natural"], category: "plants", brand: "World Market" },
  { name: "Hanging Macrame Planter", url: "https://images.unsplash.com/photo-1484154218671-7de820ebbd0a?w=600&q=80", price: 49, tags: ["bohemian", "farmhouse", "handmade"], category: "plants", brand: "Etsy" },

  // === ACCESSORIES ===
  { name: "Brass Geometric Vase", url: "https://images.unsplash.com/photo-1618221195710-611aab6fc620?w=600&q=80", price: 89, tags: ["mid-century", "art-deco", "luxe"], category: "accessories", brand: "CB2" },
  { name: "Ceramic Bud Vase Set", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80", price: 69, tags: ["japandi", "minimalist", "organic"], category: "accessories", brand: "Menu" },
  { name: "Scented Candle Trio", url: "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=600&q=80", price: 59, tags: ["scandinavian", "minimalist", "cozy"], category: "accessories", brand: "Aesop" },
  { name: "Marble Bookend Pair", url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80", price: 99, tags: ["contemporary", "minimalist", "luxe"], category: "accessories", brand: "West Elm" },
  { name: "Abstract Ceramic Sculpture", url: "https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=600&q=80", price: 249, tags: ["contemporary", "maximalist", "artistic"], category: "accessories", brand: "Anthropologie" },
  { name: "Driftwood Serving Tray", url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600&q=80", price: 79, tags: ["coastal", "rustic", "natural"], category: "accessories", brand: "Crate & Barrel" },
  { name: "Woven Seagrass Tray", url: "https://images.unsplash.com/photo-1506974210756-8e1b8985d348?w=600&q=80", price: 69, tags: ["bohemian", "coastal", "natural"], category: "accessories", brand: "World Market" },
];

export async function seedProducts() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
  if (existing[0]?.count > 0) {
    return;
  }

  await db.insert(productsTable).values(
    SEED_PRODUCTS.map((p) => ({
      url: p.url,
      name: p.name,
      price: p.price,
      tags: p.tags,
      category: p.category,
      brand: p.brand ?? null,
      source: "mock",
    }))
  );

  console.log(`Seeded ${SEED_PRODUCTS.length} products`);
}
