import React, { useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";

interface ColorEntry {
  name: string;
  hex: string;
}

interface StyleResult {
  colorPalette: ColorEntry[];
  materials: string[];
  styleTags: string[];
}

const MATERIAL_IMAGES: Record<string, string> = {
  "Marble":            "https://images.pexels.com/photos/12956025/pexels-photo-12956025.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Linen":             "https://images.pexels.com/photos/1487713/pexels-photo-1487713.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Natural Stone":     "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Stone":             "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Velvet":            "https://static.vecteezy.com/system/resources/thumbnails/035/328/570/small/pink-velvet-fabric-texture-used-as-background-empty-pink-fabric-background-luxury-of-soft-and-smooth-textile-material-there-is-space-for-text-photo.jpg",
  "Wool":              "https://static.vecteezy.com/system/resources/thumbnails/055/426/675/small/close-up-of-beige-wool-knit-texture-in-rows-for-warm-winter-clothing-concept-photo.jpeg",
  "Rattan":            "https://www.sketchuptextureclub.com/public/texture_m/0070-synthetic-wicker-texture-seamless.jpg",
  "Sisal":             "https://www.sketchuptextureclub.com/public/texture_m/0070-synthetic-wicker-texture-seamless.jpg",
  "Woven Textiles":    "https://www.sketchuptextureclub.com/public/texture_m/0070-synthetic-wicker-texture-seamless.jpg",
  "Macramé":           "https://www.sketchuptextureclub.com/public/texture_m/0070-synthetic-wicker-texture-seamless.jpg",
  "Oak":               "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  "Teak":              "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  "Natural Wood":      "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  "Lacquered Wood":    "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  "Birch":             "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  "Reclaimed Wood":    "https://reclaimedlumberproducts.com/cdn/shop/files/reclaimed-wood-wall-aged-paneling-planks-antique-bandsawn-texture-419_8426da10-dea1-454e-a631-5fec177c0c08_800x.jpg?v=1715792038",
  "Unfinished Wood":   "https://reclaimedlumberproducts.com/cdn/shop/files/reclaimed-wood-wall-aged-paneling-planks-antique-bandsawn-texture-419_8426da10-dea1-454e-a631-5fec177c0c08_800x.jpg?v=1715792038",
  "Shiplap":           "https://reclaimedlumberproducts.com/cdn/shop/files/reclaimed-wood-wall-aged-paneling-planks-antique-bandsawn-texture-419_8426da10-dea1-454e-a631-5fec177c0c08_800x.jpg?v=1715792038",
  "Leather":           "https://everytexture.com/wp-content/uploads/2019/02/everytexture.com-stock-fabric-leather-texture-00007-1024x768.jpg",
  "Ceramic":           "https://i.pinimg.com/originals/fc/60/25/fc6025d44440020fbb98818c4765e2ee.jpg",
  "Bouclé":            "https://luxurysofabric.com/cdn/shop/files/il_fullxfull.4843469074_rmhv_512x384.jpg?v=1729369553",
  "Sherpa":            "https://luxurysofabric.com/cdn/shop/files/il_fullxfull.4843469074_rmhv_512x384.jpg?v=1729369553",
  "Cotton":            "https://images.pexels.com/photos/1487713/pexels-photo-1487713.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Bamboo":            "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Exposed Brick":     "https://img.magnific.com/premium-photo/peeling-plaster-exposed-brick-wall-texture_544662-10011.jpg?w=400&q=80",
  "Polished Concrete": "https://png.pngtree.com/thumb_back/fh260/background/20231227/pngtree-background-of-wallpaper-with-gray-concrete-texture-image_13829277.png",
  "Glass":             "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Brass":             "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  "Raw Steel":         "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Steel":             "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Mixed Metals":      "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Crystal":           "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Corian":            "https://images.pexels.com/photos/12956025/pexels-photo-12956025.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Rich Fabrics":      "https://static.vecteezy.com/system/resources/thumbnails/035/328/570/small/pink-velvet-fabric-texture-used-as-background-empty-pink-fabric-background-luxury-of-soft-and-smooth-textile-material-there-is-space-for-text-photo.jpg",
  "Terracotta Tile":   "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  "Molded Plastic":    "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
};

const FALLBACK_MATERIAL_IMG =
  "https://images.pexels.com/photos/20536223/pexels-photo-20536223/free-photo-of-textured-stone-surface-with-natural-patterns.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function makeGradient(hex: string): [string, string, string] {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (rv: number, gv: number, bv: number) =>
    `#${rv.toString(16).padStart(2, "0")}${gv.toString(16).padStart(2, "0")}${bv.toString(16).padStart(2, "0")}`;
  const tint = toHex(
    Math.round(r + (255 - r) * 0.42),
    Math.round(g + (255 - g) * 0.42),
    Math.round(b + (255 - b) * 0.42),
  );
  const shade = toHex(
    Math.round(r * 0.58),
    Math.round(g * 0.58),
    Math.round(b * 0.58),
  );
  return [tint, hex, shade];
}

function MaterialTile({ name, tileW, tileH }: { name: string; tileW: number; tileH: number }) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = MATERIAL_IMAGES[name] ?? FALLBACK_MATERIAL_IMG;

  return (
    <View style={[s.materialTile, { width: tileW, height: tileH }]}>
      {!imgError ? (
        <Image
          source={{ uri: imgUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#4a4a4a" }]} />
      )}
      <View style={s.materialOverlay}>
        <Text style={s.materialName} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </View>
  );
}

export default function QuizResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { result } = useLocalSearchParams<{ result: string }>();
  const { completeQuiz } = useUser();

  let styleResult: StyleResult | null = null;
  try {
    if (result) styleResult = JSON.parse(result);
  } catch {}

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const contentW = screenW - 40;
  const tileW = Math.floor((contentW - 16) / 3);
  const tileH = Math.round(tileW * 0.9);

  const palette = (styleResult?.colorPalette ?? []).slice(0, 4);
  const materials = (styleResult?.materials ?? []).slice(0, 6);
  const tags = (styleResult?.styleTags ?? []).slice(0, 10);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: topInset + 12, paddingBottom: insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={[s.badgeCircle, { backgroundColor: colors.primary + "1A" }]}>
          <Ionicons name="sparkles" size={22} color={colors.primary} />
        </View>
        <Text style={[s.title, { color: colors.foreground }]}>Your Style Profile</Text>
      </View>

      {/* Color Palette */}
      {palette.length > 0 && (
        <View style={s.section}>
          <Text style={[s.label, { color: colors.mutedForeground }]}>Color Palette</Text>
          <View style={s.paletteRow}>
            {palette.map((c, i) => {
              const gradient = makeGradient(c.hex);
              return (
                <View key={i} style={s.swatchItem}>
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={s.swatchCircle}
                  />
                  <Text style={[s.swatchName, { color: colors.foreground }]} numberOfLines={2}>
                    {c.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Materials & Textures */}
      {materials.length > 0 && (
        <View style={s.section}>
          <Text style={[s.label, { color: colors.mutedForeground }]}>Materials & Textures</Text>
          <View style={s.materialGrid}>
            {materials.map((m, i) => (
              <MaterialTile key={i} name={m} tileW={tileW} tileH={tileH} />
            ))}
          </View>
        </View>
      )}

      {/* Aesthetic Tags */}
      {tags.length > 0 && (
        <View style={s.section}>
          <Text style={[s.label, { color: colors.mutedForeground }]}>Your Aesthetic</Text>
          <View style={s.tagsWrap}>
            {tags.map((t, i) => (
              <View
                key={i}
                style={[
                  s.tag,
                  { backgroundColor: colors.primary + "16", borderColor: colors.primary + "38" },
                ]}
              >
                <Text style={[s.tagText, { color: colors.primary }]}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* CTA */}
      <Pressable
        style={[s.enterBtn, { backgroundColor: colors.primary }]}
        onPress={completeQuiz}
      >
        <Text style={[s.enterBtnText, { color: colors.primaryForeground }]}>
          Explore StyleSwipe
        </Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },

  header: { alignItems: "center", gap: 8, paddingBottom: 4 },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },

  section: { gap: 10 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  paletteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  swatchItem: { alignItems: "center", gap: 7, flex: 1 },
  swatchCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  swatchName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 14,
    maxWidth: 70,
  },

  materialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  materialTile: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  materialOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  materialName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    lineHeight: 14,
  },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 4,
  },
  enterBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
