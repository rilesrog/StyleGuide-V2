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
  { url: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&q=80", tags: ["minimalist", "white", "clean", "bedroom"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80", tags: ["minimalist", "white", "airy", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=800&q=80", tags: ["minimalist", "neutral", "calm", "serene"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80", tags: ["minimalist", "bathroom", "clean", "zen"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=800&q=80", tags: ["minimalist", "white", "uncluttered", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80", tags: ["minimalist", "bedroom", "neutral", "calm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80", tags: ["minimalist", "bedroom", "dark", "moody"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1630699144867-37acec97df5a?w=800&q=80", tags: ["minimalist", "white", "contemporary", "open"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80", tags: ["minimalist", "workspace", "clean", "airy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&q=80", tags: ["minimalist", "japandi", "zen", "serene"], source: "curated" },

  // === SCANDINAVIAN ===
  { url: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80", tags: ["scandinavian", "minimalist", "cozy", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80", tags: ["scandinavian", "minimalist", "neutral", "clean"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1616137466211-f939a420be84?w=800&q=80", tags: ["scandinavian", "contemporary", "warm", "neutral"], source: "curated" },

  // === JAPANDI ===
  { url: "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&q=80", tags: ["japandi", "minimalist", "zen", "neutral"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=80", tags: ["japandi", "minimalist", "natural", "calm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800&q=80", tags: ["japandi", "minimalist", "natural", "wood"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80", tags: ["japandi", "zen", "serene", "natural"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1612965607446-25e1ef880114?w=800&q=80", tags: ["japandi", "minimalist", "calm", "grounded"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1620503374021-9f53ad97044c?w=800&q=80", tags: ["japandi", "zen", "wabi-sabi", "natural"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800&q=80", tags: ["japandi", "minimalist", "light", "neutral"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598928236985-dcb2aafd1de9?w=800&q=80", tags: ["japandi", "serene", "natural", "grounded"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1574643156929-51e1ba78c978?w=800&q=80", tags: ["japandi", "wood", "natural", "calm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1602872030490-4a484a7b3ba6?w=800&q=80", tags: ["japandi", "bedroom", "serene", "zen"], source: "curated" },

  // === INDUSTRIAL ===
  { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80", tags: ["industrial", "contemporary", "dark", "urban"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", tags: ["industrial", "dark", "contemporary", "bold"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560185893-a55a5592f2e6?w=800&q=80", tags: ["industrial", "modern", "neutral", "open"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80", tags: ["industrial", "eclectic", "bold", "artistic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1505409628601-edc9af17fda6?w=800&q=80", tags: ["industrial", "kitchen", "dark", "urban"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80", tags: ["industrial", "loft", "raw", "edgy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", tags: ["industrial", "loft", "dark", "urban"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800&q=80", tags: ["industrial", "raw", "edgy", "unconventional"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1574691250077-03a929faece5?w=800&q=80", tags: ["industrial", "workspace", "dark", "modern"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80", tags: ["industrial", "exterior", "bold", "dark"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1509600110300-21b9b80d4dd2?w=800&q=80", tags: ["industrial", "urban", "loft", "raw"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1524230572899-a752b3835840?w=800&q=80", tags: ["industrial", "dark", "moody", "dramatic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80", tags: ["industrial", "bedroom", "dark", "modern"], source: "curated" },

  // === BOHEMIAN ===
  { url: "https://images.unsplash.com/photo-1617104424032-b11f58c576ea?w=800&q=80", tags: ["bohemian", "colorful", "warm", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", tags: ["bohemian", "warm", "textured", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80", tags: ["bohemian", "colorful", "plants", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1590725140246-bef7c1a63791?w=800&q=80", tags: ["bohemian", "warm", "layered", "expressive"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1520116468816-95b69f847357?w=800&q=80", tags: ["bohemian", "bedroom", "colorful", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=800&q=80", tags: ["bohemian", "eclectic", "global", "free-spirited"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=800&q=80", tags: ["bohemian", "plants", "natural", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1519974719765-e6559eac2575?w=800&q=80", tags: ["bohemian", "textured", "layered", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=800&q=80", tags: ["bohemian", "plants", "macrame", "natural"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80", tags: ["bohemian", "living", "eclectic", "colorful"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=800&q=80", tags: ["bohemian", "warm", "layered", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1551907686-f0e34a9d81f7?w=800&q=80", tags: ["bohemian", "textiles", "warm", "expressive"], source: "curated" },

  // === FARMHOUSE ===
  { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", tags: ["farmhouse", "rustic", "white", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1484101680937-0a33f0d7e1d3?w=800&q=80", tags: ["farmhouse", "rustic", "cozy", "neutral"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800&q=80", tags: ["farmhouse", "rustic", "wood", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?w=800&q=80", tags: ["farmhouse", "kitchen", "rustic", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=800&q=80", tags: ["farmhouse", "bedroom", "cozy", "rustic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800&q=80", tags: ["farmhouse", "living", "neutral", "comfortable"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80", tags: ["farmhouse", "exterior", "rustic", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?w=800&q=80", tags: ["farmhouse", "dining", "rustic", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=800&q=80", tags: ["farmhouse", "rustic", "warm", "wood"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800&q=80", tags: ["farmhouse", "bedroom", "neutral", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560040668-3c1d7a5b6cdb?w=800&q=80", tags: ["farmhouse", "kitchen", "rustic", "neutral"], source: "curated" },

  // === CONTEMPORARY ===
  { url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80", tags: ["contemporary", "modern", "neutral", "clean"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80", tags: ["contemporary", "modern", "warm", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800&q=80", tags: ["contemporary", "bold", "colorful", "modern"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80", tags: ["contemporary", "neutral", "minimalist", "modern"], source: "curated" },

  // === COASTAL ===
  { url: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80", tags: ["coastal", "bright", "airy", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1484154218671-7de820ebbd0a?w=800&q=80", tags: ["coastal", "rustic", "neutral", "relaxed"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", tags: ["coastal", "bedroom", "light", "breezy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1537726235470-8504e3beef77?w=800&q=80", tags: ["coastal", "living", "airy", "relaxed"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80", tags: ["coastal", "bright", "white", "breezy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80", tags: ["coastal", "bedroom", "neutral", "light-filled"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80", tags: ["coastal", "white", "bright", "effortless"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1609766858967-f4eb6d2e3d73?w=800&q=80", tags: ["coastal", "breezy", "natural", "relaxed"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&q=80", tags: ["coastal", "dining", "airy", "light"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1595348020949-87cdfbb44174?w=800&q=80", tags: ["coastal", "kitchen", "white", "relaxed"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", tags: ["coastal", "exterior", "bright", "airy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1602343168117-bb8ced3f3081?w=800&q=80", tags: ["coastal", "living", "natural", "breezy"], source: "curated" },

  // === MID-CENTURY MODERN ===
  { url: "https://images.unsplash.com/photo-1565538787857-d7eb85d02b3a?w=800&q=80", tags: ["mid-century", "retro", "contemporary", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80", tags: ["mid-century", "warm", "textured", "retro"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80", tags: ["mid-century", "living", "retro-chic", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556910096-6f5e72db6803?w=800&q=80", tags: ["mid-century", "iconic", "nostalgic", "organic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=800&q=80", tags: ["mid-century", "living", "warm", "retro"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1524397057410-1e775ed476f3?w=800&q=80", tags: ["mid-century", "bedroom", "warm", "vintage"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598928056546-ecbba1b9b9d2?w=800&q=80", tags: ["mid-century", "dining", "retro", "iconic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1493775823534-d3e4b2706f82?w=800&q=80", tags: ["mid-century", "kitchen", "retro", "vintage"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1506784926709-22f1ec395907?w=800&q=80", tags: ["mid-century", "living", "organic", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1571501679680-de32f1e7aad4?w=800&q=80", tags: ["mid-century", "vintage", "nostalgic", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1586892477838-2b96e85e0f96?w=800&q=80", tags: ["mid-century", "lounge", "retro-chic", "iconic"], source: "curated" },

  // === MAXIMALIST / ECLECTIC ===
  { url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80", tags: ["maximalist", "bold", "colorful", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1592150621744-aca64f48394a?w=800&q=80", tags: ["maximalist", "eclectic", "artistic", "colorful"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?w=800&q=80", tags: ["maximalist", "bold", "layered", "expressive"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800&q=80", tags: ["maximalist", "dramatic", "colorful", "collected"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80", tags: ["maximalist", "bold", "artistic", "expressive"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80", tags: ["maximalist", "layered", "colorful", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598765549696-03ee8af8f3d3?w=800&q=80", tags: ["maximalist", "bold", "statement-making", "dramatic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560185008-b033106af5c3?w=800&q=80", tags: ["maximalist", "colorful", "expressive", "collected"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1560185127-6a9e36bc4b4f?w=800&q=80", tags: ["maximalist", "bold", "vibrant", "dramatic"], source: "curated" },

  // === RUSTIC ===
  { url: "https://images.unsplash.com/photo-1506974210756-8e1b8985d348?w=800&q=80", tags: ["rustic", "warm", "natural", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80", tags: ["rustic", "warm", "wood", "farmhouse"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600121848594-d8644e57abcd?w=800&q=80", tags: ["rustic", "bohemian", "plants", "natural"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80", tags: ["rustic", "cabin", "cozy", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80", tags: ["rustic", "exterior", "warm", "natural"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1604014237744-74d7da62e4aa?w=800&q=80", tags: ["rustic", "kitchen", "natural", "wood"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1531694611353-d4758f66db49?w=800&q=80", tags: ["rustic", "living", "warm", "grounded"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1598924614741-98cc0c7cc39d?w=800&q=80", tags: ["rustic", "bedroom", "authentic", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1604014438521-a0c5c21bd5a5?w=800&q=80", tags: ["rustic", "warm", "textured", "natural"], source: "curated" },

  // === ART DECO / GLAM ===
  { url: "https://images.unsplash.com/photo-1618221195710-611aab6fc620?w=800&q=80", tags: ["art-deco", "glamorous", "bold", "luxe"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=800&q=80", tags: ["art-deco", "maximalist", "dramatic", "bold"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1614082242261-4a02e3f80b6e?w=800&q=80", tags: ["art-deco", "glamorous", "geometric", "luxurious"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80", tags: ["art-deco", "dramatic", "opulent", "bold"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1600566752229-250ed79470f8?w=800&q=80", tags: ["art-deco", "luxurious", "glamorous", "dramatic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1567721913486-6585f069b406?w=800&q=80", tags: ["art-deco", "geometric", "bold", "luxe"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1573053986940-9dd87a19f4b0?w=800&q=80", tags: ["art-deco", "glam", "dramatic", "opulent"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1605346576626-4ca9a2f0fb08?w=800&q=80", tags: ["art-deco", "glamorous", "rich", "bold"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800&q=80", tags: ["art-deco", "luxurious", "geometric", "sophisticated"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80", tags: ["art-deco", "opulent", "maximalist", "glam"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1594230516527-be80f8b5d7bc?w=800&q=80", tags: ["art-deco", "dramatic", "bold", "luxe"], source: "curated" },

  // === ADDITIONAL MINIMALIST ===
  { url: "https://images.unsplash.com/photo-1571460009273-f06f79bb8ad1?w=800&q=80", tags: ["minimalist", "bedroom", "serene", "white"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1618221469555-7f3ad97540d6?w=800&q=80", tags: ["minimalist", "living", "neutral", "open"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1493957988430-a5f2e15f39a3?w=800&q=80", tags: ["minimalist", "studio", "airy", "clean"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1536321115970-5dfa13356211?w=800&q=80", tags: ["minimalist", "contemporary", "white", "calm"], source: "curated" },

  // === ADDITIONAL BOHEMIAN ===
  { url: "https://images.unsplash.com/photo-1578898886560-cd7ab50a4b48?w=800&q=80", tags: ["bohemian", "warm", "colorful", "expressive"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1522444195799-478538b28823?w=800&q=80", tags: ["bohemian", "bedroom", "layered", "eclectic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1595515106969-1ce7ba2c30d6?w=800&q=80", tags: ["bohemian", "plants", "warm", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&q=80", tags: ["bohemian", "textured", "global", "expressive"], source: "curated" },

  // === ADDITIONAL INDUSTRIAL ===
  { url: "https://images.unsplash.com/photo-1613068687893-5e85b4638b56?w=800&q=80", tags: ["industrial", "living", "raw", "dark"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1585128792020-803d29415281?w=800&q=80", tags: ["industrial", "kitchen", "bold", "urban"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=800&q=80", tags: ["industrial", "loft", "edgy", "unconventional"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=800&q=80", tags: ["industrial", "bathroom", "dark", "modern"], source: "curated" },

  // === ADDITIONAL COASTAL ===
  { url: "https://images.unsplash.com/photo-1613545325278-f24b0cae1224?w=800&q=80", tags: ["coastal", "living", "breezy", "light-filled"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80", tags: ["coastal", "bright", "airy", "effortless"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1503174971373-b1f69850bded?w=800&q=80", tags: ["coastal", "bedroom", "relaxed", "natural"], source: "curated" },

  // === ADDITIONAL RUSTIC ===
  { url: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800&q=80", tags: ["rustic", "living", "cozy", "warm"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1532372576444-dda954194ad0?w=800&q=80", tags: ["rustic", "kitchen", "warm", "natural"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1565182999561-18d7dc61c393?w=800&q=80", tags: ["rustic", "cabin", "cozy", "grounded"], source: "curated" },

  // === ADDITIONAL ART-DECO ===
  { url: "https://images.unsplash.com/photo-1586380951230-5a79c0b2a8d8?w=800&q=80", tags: ["art-deco", "dining", "glamorous", "opulent"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80", tags: ["art-deco", "hotel", "dramatic", "luxurious"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80", tags: ["art-deco", "bold", "geometric", "glamorous"], source: "curated" },

  // === ADDITIONAL JAPANDI ===
  { url: "https://images.unsplash.com/photo-1607631568010-a87245c0daf8?w=800&q=80", tags: ["japandi", "bathroom", "serene", "natural"], source: "curated" },

  // === ADDITIONAL FARMHOUSE ===
  { url: "https://images.unsplash.com/photo-1562664377-709f2c337eb2?w=800&q=80", tags: ["farmhouse", "porch", "rustic", "comfortable"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80", tags: ["farmhouse", "kitchen", "white", "cozy"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=80", tags: ["farmhouse", "bedroom", "neutral", "warm"], source: "curated" },

  // === ADDITIONAL MID-CENTURY ===
  { url: "https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=800&q=80", tags: ["mid-century", "retro", "organic", "iconic"], source: "curated" },
  { url: "https://images.unsplash.com/photo-1556912173-3bb406ef7e8b?w=800&q=80", tags: ["mid-century", "dining", "warm", "nostalgic"], source: "curated" },

  // === ADDITIONAL MAXIMALIST ===
  { url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80", tags: ["maximalist", "bedroom", "bold", "expressive"], source: "curated" },
];

export async function seedStylePhotos() {
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(stylePhotosTable);
  if (existing[0]?.count >= SEED_PHOTOS.length) {
    return;
  }

  const existingUrls = await db.select({ url: stylePhotosTable.url }).from(stylePhotosTable);
  const existingUrlSet = new Set(existingUrls.map((r) => r.url));

  const newPhotos = SEED_PHOTOS.filter((p) => !existingUrlSet.has(p.url));
  if (newPhotos.length === 0) return;

  await db.insert(stylePhotosTable).values(
    newPhotos.map((p) => ({
      url: p.url,
      tags: p.tags,
      source: p.source,
    }))
  );

  const total = existing[0]?.count + newPhotos.length;
  console.log(`Seeded ${newPhotos.length} new style photos (total: ${total})`);
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
