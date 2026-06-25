import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

export default function QuizResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { result } = useLocalSearchParams<{ result: string }>();
  const { completeQuiz } = useUser();

  let styleResult: StyleResult | null = null;
  try {
    if (result) styleResult = JSON.parse(result);
  } catch {}

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: topInset + 16, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[s.celebrationBadge, { backgroundColor: colors.primary + "20" }]}>
        <Ionicons name="sparkles" size={28} color={colors.primary} />
      </View>

      <Text style={[s.title, { color: colors.foreground }]}>Your Style Profile</Text>
      <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
        Based on what you love, here's your design identity
      </Text>

      {styleResult && (
        <>
          {/* Color Palette */}
          <View style={[s.section, { backgroundColor: colors.card }]}>
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>Color Palette</Text>
            <View style={s.paletteRow}>
              {styleResult.colorPalette.map((c, i) => (
                <View key={i} style={s.paletteItem}>
                  <View
                    style={[
                      s.swatch,
                      {
                        backgroundColor: c.hex,
                        borderColor: colors.border,
                      },
                    ]}
                  />
                  <Text style={[s.swatchName, { color: colors.foreground }]} numberOfLines={2}>
                    {c.name}
                  </Text>
                  <Text style={[s.swatchHex, { color: colors.mutedForeground }]}>{c.hex}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Materials */}
          <View style={[s.section, { backgroundColor: colors.card }]}>
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>Materials & Textures</Text>
            <View style={s.chipsWrap}>
              {styleResult.materials.map((m, i) => (
                <View key={i} style={[s.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[s.chipText, { color: colors.foreground }]}>{m}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Style Tags */}
          <View style={[s.section, { backgroundColor: colors.card }]}>
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>Your Aesthetic</Text>
            <View style={s.chipsWrap}>
              {styleResult.styleTags.map((t, i) => (
                <View key={i} style={[s.chip, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                  <Text style={[s.chipText, { color: colors.primary }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      <View style={[s.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.mutedForeground} />
        <Text style={[s.infoText, { color: colors.mutedForeground }]}>
          Your profile refines automatically as you keep swiping. Check back anytime in Profile.
        </Text>
      </View>

      <Pressable
        style={[s.enterBtn, { backgroundColor: colors.primary }]}
        onPress={completeQuiz}
      >
        <Text style={[s.enterBtnText, { color: colors.primaryForeground }]}>Explore StyleSwipe</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, alignItems: "center", gap: 20 },
  celebrationBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, marginTop: -8 },
  section: { borderRadius: 20, padding: 20, width: "100%", gap: 16 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  paletteRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  paletteItem: { alignItems: "center", gap: 6, flex: 1, minWidth: 56, maxWidth: 72 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  swatchName: { fontSize: 11, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 14 },
  swatchHex: { fontSize: 10, fontFamily: "Inter_400Regular" },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  enterBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
});
