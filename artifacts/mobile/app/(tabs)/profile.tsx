import { useGetStyleProfile } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { Svg, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode, type AppMode } from "@/context/ModeContext";

const MATERIAL_IMAGES: Record<string, string> = {
  marble: "https://images.pexels.com/photos/4709486/pexels-photo-4709486.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  velvet: "https://images.pexels.com/photos/6044191/pexels-photo-6044191.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  brass: "https://images.pexels.com/photos/3467946/pexels-photo-3467946.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  linen: "https://images.pexels.com/photos/1487713/pexels-photo-1487713.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  cotton: "https://images.pexels.com/photos/1487713/pexels-photo-1487713.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  stone: "https://images.pexels.com/photos/20536223/pexels-photo-20536223.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  rattan: "https://i.pinimg.com/originals/5a/ec/30/5aec30db18cef864ce24386f96fee596.jpg",
  oak: "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  teak: "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  wood: "https://www.sketchuptextureclub.com/public/texture/111-teak-wood-fine-medium-color-texture-seamless.jpg",
  walnut: "https://images.pexels.com/photos/172296/pexels-photo-172296.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  ceramic: "https://images.pexels.com/photos/2162938/pexels-photo-2162938.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  concrete: "https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  glass: "https://images.pexels.com/photos/3536520/pexels-photo-3536520.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  leather: "https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
  wool: "https://images.pexels.com/photos/3735218/pexels-photo-3735218.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400",
};
const FALLBACK_MATERIAL_IMG = "https://images.pexels.com/photos/1029604/pexels-photo-1029604.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=400";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

function makeGradient(hex: string): [string, string, string] {
  const { r, g, b } = hexToRgb(hex);
  const lighter = `rgba(${Math.min(r + 60, 255)},${Math.min(g + 60, 255)},${Math.min(b + 60, 255)},1)`;
  const base = `rgba(${r},${g},${b},1)`;
  const darker = `rgba(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)},1)`;
  return [lighter, base, darker];
}

function MaterialTile({ name, tileW, tileH }: { name: string; tileW: number; tileH: number }) {
  const key = name.toLowerCase();
  const uri = MATERIAL_IMAGES[key] ?? FALLBACK_MATERIAL_IMG;
  const [errored, setErrored] = React.useState(false);
  return (
    <View style={{ width: tileW, height: tileH, borderRadius: 12, overflow: "hidden", backgroundColor: "#ccc" }}>
      <Image
        source={{ uri: errored ? FALLBACK_MATERIAL_IMG : uri }}
        style={{ width: "100%", height: "100%" }}
        resizeMode="cover"
        onError={() => setErrored(true)}
      />
      <View style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 5, paddingHorizontal: 8,
      }}>
        <Text style={{ color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>{name}</Text>
      </View>
    </View>
  );
}

const SLICE_SHADES = ["#111111", "#2e2e2e", "#4b4b4b", "#686868", "#858585", "#a2a2a2", "#bfbfbf", "#d6d6d6"];

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSlicePath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
) {
  const o1 = polarToCart(cx, cy, outerR, startDeg);
  const o2 = polarToCart(cx, cy, outerR, endDeg);
  const i1 = polarToCart(cx, cy, innerR, endDeg);
  const i2 = polarToCart(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(3)} ${o2.y.toFixed(3)}`,
    `L ${i1.x.toFixed(3)} ${i1.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(3)} ${i2.y.toFixed(3)}`,
    "Z",
  ].join(" ");
}

function StyleDnaPie({
  tagWeights,
  foreground,
  muted,
}: {
  tagWeights: Array<{ tag: string; score: number }>;
  foreground: string;
  muted: string;
}) {
  const top = tagWeights.slice(0, 8);
  const total = top.reduce((s, t) => s + t.score, 0) || 1;
  const SIZE = 180;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outerR = 76;
  const innerR = 48;
  const GAP_DEG = 1.5;

  let cursor = 0;
  const slices = top.map((t, i) => {
    const pct = t.score / total;
    const span = pct * 360;
    const startDeg = cursor + GAP_DEG / 2;
    const endDeg = cursor + span - GAP_DEG / 2;
    cursor += span;
    return { ...t, pct, startDeg, endDeg, color: SLICE_SHADES[i] ?? "#ddd" };
  });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ alignItems: "center" }}>
        <Svg width={SIZE} height={SIZE}>
          {slices.map((sl, i) => (
            <Path
              key={i}
              d={donutSlicePath(cx, cy, outerR, innerR, sl.startDeg, sl.endDeg)}
              fill={sl.color}
            />
          ))}
        </Svg>
      </View>
      <View style={{ gap: 8 }}>
        {slices.map((sl, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sl.color }} />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: foreground, textTransform: "capitalize" }}>
              {sl.tag}
            </Text>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: muted }}>
              {Math.round(sl.pct * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

type Segment = "you" | "style";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const router = useRouter();
  // tile width: screen minus scroll padding (24×2) minus section padding (20×2) minus 2 gaps (8×2)
  const tileW = Math.floor((screenW - 48 - 40 - 16) / 3);
  const tileH = Math.floor(tileW * 0.92);
  const { name, email, isLoggedIn, logout } = useUser();
  const { session, isActive, startSession, leaveSession } = useSession();
  const { mode, setMode } = useMode();
  const [startingSession, setStartingSession] = React.useState(false);
  const [segment, setSegment] = useState<Segment>("you");
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleModeSelect = async (m: AppMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setMode(m);
  };

  const handleStartSession = async () => {
    setStartingSession(true);
    try {
      await startSession();
      router.push("/invite");
    } catch {
    } finally {
      setStartingSession(false);
    }
  };

  const { data: profileData, isLoading: profileLoading } = useGetStyleProfile({
    query: { enabled: isLoggedIn, staleTime: 0 },
  } as never);

  const tagWeights = (profileData?.tagWeights ?? []) as Array<{ tag: string; score: number; count: number }>;
  const totalSwipes = profileData?.totalSwipes ?? 0;
  const likedCount = profileData?.likedCount ?? 0;
  const styleResult = (profileData as { styleResult?: unknown })?.styleResult ?? null;

  const initials = name
    ? name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  };

  const s = stylesheet(colors);

  const colorPalette = (styleResult as { colorPalette?: Array<{ hex: string; name: string }> })?.colorPalette ?? [];
  const materials = (styleResult as { materials?: string[] })?.materials ?? [];
  const styleTags = (styleResult as { styleTags?: string[] })?.styleTags ?? [];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* ── Sticky header: avatar + name + segment toggle ── */}
      <View style={[s.stickyHeader, { paddingTop: topInset + 8, backgroundColor: colors.background }]}>
        <View style={s.identity}>
          <View style={[s.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[s.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
          </View>
          <View style={s.identityText}>
            <Text style={[s.name, { color: colors.foreground }]} numberOfLines={1}>{name ?? "User"}</Text>
            <Text style={[s.email, { color: colors.mutedForeground }]} numberOfLines={1}>{email ?? ""}</Text>
          </View>
        </View>

        {/* Segment toggle */}
        <View style={[s.segmentBar, { backgroundColor: colors.muted }]}>
          <Pressable
            style={[s.segmentOption, segment === "you" && { backgroundColor: colors.background }]}
            onPress={() => setSegment("you")}
          >
            <Ionicons name="person-outline" size={14} color={segment === "you" ? colors.foreground : colors.mutedForeground} />
            <Text style={[s.segmentText, { color: segment === "you" ? colors.foreground : colors.mutedForeground }]}>You</Text>
          </Pressable>
          <Pressable
            style={[s.segmentOption, segment === "style" && { backgroundColor: colors.background }]}
            onPress={() => setSegment("style")}
          >
            <Ionicons name="color-palette-outline" size={14} color={segment === "style" ? colors.foreground : colors.mutedForeground} />
            <Text style={[s.segmentText, { color: segment === "style" ? colors.foreground : colors.mutedForeground }]}>Style</Text>
          </Pressable>
        </View>
      </View>

      {/* ── You segment ── */}
      {segment === "you" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats */}
          <View style={[s.statsRow, { backgroundColor: colors.card }]}>
            <View style={s.stat}>
              <Text style={[s.statNum, { color: colors.foreground }]}>{totalSwipes}</Text>
              <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Swiped</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.stat}>
              <Text style={[s.statNum, { color: colors.foreground }]}>{likedCount}</Text>
              <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Loved</Text>
            </View>
            <View style={[s.statDivider, { backgroundColor: colors.border }]} />
            <View style={s.stat}>
              <Text style={[s.statNum, { color: colors.foreground }]}>
                {totalSwipes > 0 ? Math.round((likedCount / totalSwipes) * 100) : 0}%
              </Text>
              <Text style={[s.statLabel, { color: colors.mutedForeground }]}>Match</Text>
            </View>
          </View>

          {/* Mode selector */}
          <View style={[s.section, { backgroundColor: colors.card }]}>
            <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Mode</Text>
            <View style={[s.modeRow, { backgroundColor: colors.muted }]}>
              <Pressable
                style={[s.modeOption, mode === "decoration" && { backgroundColor: colors.background }]}
                onPress={() => handleModeSelect("decoration")}
              >
                <Ionicons name="home-outline" size={16} color={mode === "decoration" ? colors.foreground : colors.mutedForeground} />
                <Text style={[s.modeOptionText, { color: mode === "decoration" ? colors.foreground : colors.mutedForeground }]}>
                  Home Decoration
                </Text>
              </Pressable>
              <Pressable
                style={[s.modeOption, mode === "registry" && { backgroundColor: colors.background }]}
                onPress={() => handleModeSelect("registry")}
              >
                <Ionicons name="gift-outline" size={16} color={mode === "registry" ? colors.foreground : colors.mutedForeground} />
                <Text style={[s.modeOptionText, { color: mode === "registry" ? colors.foreground : colors.mutedForeground }]}>
                  Wedding Registry
                </Text>
              </Pressable>
            </View>
            <Text style={[s.modeDesc, { color: colors.mutedForeground }]}>
              {mode === "decoration"
                ? "Sort liked products into room-by-room boards."
                : "Both partners must approve an item for it to join the registry."}
            </Text>
          </View>

          {/* Shared session */}
          <View style={[s.section, { backgroundColor: colors.card }]}>
            <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Shared Session</Text>

            {!session && (
              <Pressable
                style={[s.sessionBtn, { backgroundColor: colors.primary }]}
                onPress={handleStartSession}
                disabled={startingSession}
              >
                {startingSession
                  ? <ActivityIndicator size="small" color={colors.primaryForeground} />
                  : <Ionicons name="people-outline" size={18} color={colors.primaryForeground} />}
                <Text style={[s.sessionBtnText, { color: colors.primaryForeground }]}>
                  {startingSession ? "Creating…" : "Start a Session"}
                </Text>
              </Pressable>
            )}

            {session && !isActive && (
              <View style={s.sessionStatus}>
                <ActivityIndicator size="small" color={colors.primary} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.sessionStatusTitle, { color: colors.foreground }]}>Waiting for partner</Text>
                  <Text style={[s.sessionStatusSub, { color: colors.mutedForeground }]}>Share the invite link to get started</Text>
                </View>
                <Pressable style={[s.smallBtn, { borderColor: colors.primary }]} onPress={() => router.push("/invite")}>
                  <Text style={[s.smallBtnText, { color: colors.primary }]}>Invite</Text>
                </Pressable>
              </View>
            )}

            {session && isActive && (
              <View style={s.sessionStatus}>
                <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.sessionStatusTitle, { color: colors.foreground }]}>Active with {session.partner?.name ?? "partner"}</Text>
                  <Text style={[s.sessionStatusSub, { color: colors.mutedForeground }]}>Swipe together to find matches</Text>
                </View>
                <Pressable style={[s.smallBtn, { borderColor: colors.primary }]} onPress={() => router.push("/(tabs)/boards")}>
                  <Text style={[s.smallBtnText, { color: colors.primary }]}>Boards</Text>
                </Pressable>
              </View>
            )}

            {session && (
              <Pressable onPress={leaveSession}>
                <Text style={[s.endSession, { color: colors.mutedForeground }]}>End session</Text>
              </Pressable>
            )}
          </View>

          {/* Sign out */}
          <Pressable style={[s.logoutBtn, { borderColor: colors.destructive + "60" }]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
            <Text style={[s.logoutText, { color: colors.destructive }]}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* ── Style segment ── */}
      {segment === "style" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}
          showsVerticalScrollIndicator={false}
        >
          {profileLoading && tagWeights.length === 0 ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : tagWeights.length === 0 && !styleResult ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card }]}>
              <Ionicons name="sparkles-outline" size={40} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No style profile yet</Text>
              <Text style={[s.emptyBody, { color: colors.mutedForeground }]}>
                Swipe photos in the Inspire tab to build your style profile.
              </Text>
              <Pressable
                style={[s.goBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)")}
              >
                <Ionicons name="sparkles-outline" size={16} color={colors.primaryForeground} />
                <Text style={[s.goBtnText, { color: colors.primaryForeground }]}>Go to Discover</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Palette + aesthetic */}
              {styleResult && (
                <View style={[s.section, { backgroundColor: colors.card }]}>
                  <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>My Style</Text>

                  {colorPalette.length > 0 && (
                    <>
                      <Text style={[s.subLabel, { color: colors.foreground }]}>Color Palette</Text>
                      <View style={s.paletteRow}>
                        {colorPalette.slice(0, 4).map((c, i) => {
                          const gradient = makeGradient(c.hex);
                          return (
                            <View key={i} style={s.swatchItem}>
                              <LinearGradient
                                colors={gradient}
                                start={{ x: 0.1, y: 0 }}
                                end={{ x: 0.9, y: 1 }}
                                style={s.swatchCircle}
                              />
                              <Text style={[s.swatchName, { color: colors.foreground }]} numberOfLines={2}>{c.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </>
                  )}

                  {materials.length > 0 && (
                    <>
                      <Text style={[s.subLabel, { color: colors.foreground }]}>Materials</Text>
                      <View style={s.materialGrid}>
                        {materials.slice(0, 6).map((m: string, i: number) => (
                          <MaterialTile key={i} name={m} tileW={tileW} tileH={tileH} />
                        ))}
                      </View>
                    </>
                  )}

                  {styleTags.length > 0 && (
                    <>
                      <Text style={[s.subLabel, { color: colors.foreground }]}>Aesthetic</Text>
                      <View style={s.chips}>
                        {styleTags.slice(0, 10).map((t: string, i: number) => (
                          <View key={i} style={[s.chip, { backgroundColor: colors.primary + "16", borderColor: colors.primary + "38" }]}>
                            <Text style={[s.chipText, { color: colors.primary }]}>{t}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Style DNA */}
              {tagWeights.length > 0 && (
                <View style={[s.section, { backgroundColor: colors.card }]}>
                  <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Style DNA</Text>
                  <StyleDnaPie
                    tagWeights={tagWeights}
                    foreground={colors.foreground}
                    muted={colors.mutedForeground}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    root: { flex: 1 },
    stickyHeader: {
      paddingHorizontal: 24,
      paddingBottom: 12,
      gap: 16,
    },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 22, fontFamily: "Inter_700Bold" },
    identityText: { flex: 1, gap: 2 },
    name: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
    email: { fontSize: 13, fontFamily: "Inter_400Regular" },
    segmentBar: {
      flexDirection: "row",
      borderRadius: 20,
      padding: 3,
      gap: 2,
    },
    segmentOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 9,
      borderRadius: 18,
    },
    segmentText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    scrollContent: { paddingHorizontal: 24, paddingTop: 8, gap: 16 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
    statsRow: {
      flexDirection: "row",
      borderRadius: 20,
      paddingVertical: 20,
    },
    stat: { flex: 1, alignItems: "center", gap: 4 },
    statNum: { fontSize: 24, fontFamily: "Inter_700Bold" },
    statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
    statDivider: { width: 1, marginVertical: 4 },
    section: { borderRadius: 20, padding: 20, gap: 14 },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    subLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
    modeRow: { flexDirection: "row", borderRadius: 12, padding: 4, gap: 4 },
    modeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    modeOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    modeDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
    sessionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    sessionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    sessionStatus: { flexDirection: "row", alignItems: "center", gap: 12 },
    sessionStatusTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    sessionStatusSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
    smallBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1.5 },
    smallBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    endSession: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      textDecorationLine: "underline",
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      justifyContent: "center",
      marginTop: 8,
    },
    logoutText: { fontSize: 16, fontFamily: "Inter_500Medium" },
    emptyCard: {
      borderRadius: 20,
      padding: 32,
      alignItems: "center",
      gap: 12,
      marginTop: 8,
    },
    emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptyBody: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
    },
    goBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 4,
    },
    goBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    paletteRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
    swatchItem: { alignItems: "center", gap: 6, minWidth: 60, maxWidth: 76 },
    swatchCircle: { width: 60, height: 60, borderRadius: 30 },
    swatchName: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 13 },
    materialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1 },
    chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
    tagRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    tagRank: { width: 28 },
    rankNum: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
    tagName: { fontSize: 14, fontFamily: "Inter_400Regular", textTransform: "capitalize", width: 80 },
    barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
    barFill: { height: "100%", borderRadius: 3 },
    tagScore: { fontSize: 12, fontFamily: "Inter_400Regular", width: 34, textAlign: "right" },
  });
}
