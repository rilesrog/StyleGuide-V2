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
import { MATERIAL_IMAGES, FALLBACK_MATERIAL_IMG } from "@/constants/materialImages";

interface ColorEntry {
  name: string;
  hex: string;
}

interface StyleResult {
  colorPalette: ColorEntry[];
  materials: string[];
  styleTags: string[];
}

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
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#3a3a3a" }]} />
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
  const { width: screenW, height: screenH } = useWindowDimensions();
  const { result } = useLocalSearchParams<{ result: string }>();
  const { completeQuiz } = useUser();

  let styleResult: StyleResult | null = null;
  try {
    if (result) styleResult = JSON.parse(result);
  } catch {}

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);
  const bottomInset = insets.bottom;
  const contentW = screenW - 40;
  const tileW = Math.floor((contentW - 16) / 3);
  const tileH = Math.round(tileW * 0.92);

  const minContentH = screenH - topInset - bottomInset - 24;

  const palette = (styleResult?.colorPalette ?? []).slice(0, 4);
  const materials = (styleResult?.materials ?? []).slice(0, 6);
  const tags = (styleResult?.styleTags ?? []).slice(0, 10);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: topInset + 16,
        paddingBottom: bottomInset + 32,
        paddingHorizontal: 20,
        minHeight: minContentH,
      }}
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

      {/* Spacer pushes button to bottom */}
      <View style={s.spacer} />

      {/* CTA */}
      <Pressable
        style={[s.enterBtn, { backgroundColor: colors.primary }]}
        onPress={completeQuiz}
      >
        <Text style={[s.enterBtnText, { color: colors.primaryForeground }]}>
          See your custom picks
        </Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header: { alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 6 },
  badgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },

  section: { gap: 12, marginBottom: 28 },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  paletteRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  swatchItem: { alignItems: "center", gap: 8, flex: 1 },
  swatchCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
  },
  swatchName: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
    lineHeight: 14,
    maxWidth: 72,
  },

  materialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  materialTile: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  materialOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "rgba(0,0,0,0.50)",
  },
  materialName: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#ffffff",
    lineHeight: 14,
  },

  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  spacer: { flex: 1, minHeight: 24 },

  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  enterBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
