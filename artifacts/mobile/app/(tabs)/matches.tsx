import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type MatchedProduct = {
  id: number;
  url: string;
  name: string;
  price: number;
  tags: string[];
  category: string;
  brand?: string | null;
};

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useUser();
  const { session, isActive } = useSession();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [matches, setMatches] = useState<MatchedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMatches = useCallback(async () => {
    if (!session || !isActive || !token) return;
    try {
      const resp = await fetch(`${API_BASE}/api/sessions/${session.id}/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setMatches((data as { products: MatchedProduct[] }).products ?? []);
      }
    } catch {}
  }, [session?.id, isActive, token]);

  // Reset matches when session changes; poll every 5s when active
  useEffect(() => {
    if (!isActive) {
      setMatches([]);
      return;
    }
    setLoading(true);
    fetchMatches().finally(() => setLoading(false));

    const interval = setInterval(fetchMatches, 5000);
    return () => clearInterval(interval);
  }, [isActive, fetchMatches]);

  const s = stylesheet(colors);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: topInset + 8,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.headerTitle, { color: colors.foreground }]}>Matches</Text>

      {/* No session */}
      {!session && (
        <View style={s.emptyState}>
          <Ionicons name="heart-circle-outline" size={72} color={colors.mutedForeground} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Find Your Matches</Text>
          <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
            Start a shared session with your partner and swipe together to discover what you both love.
          </Text>
          <Pressable
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/(tabs)/profile")}
          >
            <Ionicons name="people-outline" size={18} color={colors.primaryForeground} />
            <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>
              Start a Session
            </Text>
          </Pressable>
        </View>
      )}

      {/* Session pending */}
      {session && !isActive && (
        <View style={s.emptyState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Waiting for Partner</Text>
          <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
            Share the invite link so your partner can join your session.
          </Text>
          <Pressable
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/invite")}
          >
            <Ionicons name="share-outline" size={18} color={colors.primaryForeground} />
            <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>
              View Invite
            </Text>
          </Pressable>
        </View>
      )}

      {/* Session active */}
      {isActive && session && (
        <>
          {/* Partner banner */}
          <View style={[s.partnerBanner, { backgroundColor: colors.card }]}>
            <View style={[s.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[s.avatarText, { color: colors.primaryForeground }]}>
                {session.creator.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={s.bannerText}>
              <Text style={[s.bannerTitle, { color: colors.foreground }]}>Session active</Text>
              <Text style={[s.bannerSub, { color: colors.mutedForeground }]}>
                Swiping with {session.partner?.name ?? "partner"}
              </Text>
            </View>
            <View style={[s.avatar, { backgroundColor: colors.primary + "55" }]}>
              <Text style={[s.avatarText, { color: colors.primaryForeground }]}>
                {(session.partner?.name ?? "P").charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {loading && matches.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} style={s.spinner} />
          ) : matches.length === 0 ? (
            <View style={s.emptyState}>
              <Ionicons name="swap-horizontal-outline" size={56} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.foreground }]}>No matches yet</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
                Both of you need to swipe right on the same product to create a match.
              </Text>
              <Pressable
                style={[s.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push("/(tabs)/shop")}
              >
                <Ionicons name="bag-outline" size={18} color={colors.primaryForeground} />
                <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>
                  Go to Shop
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[s.matchCount, { color: colors.mutedForeground }]}>
                {matches.length} {matches.length === 1 ? "match" : "matches"}
              </Text>
              <View style={s.grid}>
                {matches.map((product) => (
                  <MatchCard key={product.id} product={product} colors={colors} />
                ))}
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function MatchCard({
  product,
  colors,
}: {
  product: MatchedProduct;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const s = StyleSheet.create({
    card: {
      width: CARD_WIDTH,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.card,
    },
    imageWrap: { position: "relative", width: "100%", aspectRatio: 1 },
    image: { width: "100%", height: "100%" },
    badge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: "#E91E63",
      alignItems: "center",
      justifyContent: "center",
    },
    info: { padding: 10, gap: 4 },
    name: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      lineHeight: 18,
      color: colors.foreground,
    },
    price: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
      color: colors.primary,
    },
  });

  return (
    <View style={s.card}>
      <View style={s.imageWrap}>
        <Image source={{ uri: product.url }} style={s.image} resizeMode="cover" />
        <View style={s.badge}>
          <Ionicons name="heart" size={12} color="#fff" />
        </View>
      </View>
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={s.price}>${product.price.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { paddingHorizontal: 24, gap: 16 },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      marginBottom: 4,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 32,
      gap: 16,
    },
    emptyTitle: {
      fontSize: 22,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
    emptySub: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 16,
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 4,
    },
    primaryBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    partnerBanner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      gap: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    bannerText: { flex: 1, gap: 2 },
    bannerTitle: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    bannerSub: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
    },
    spinner: { marginTop: 32 },
    matchCount: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: -4,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: CARD_GAP,
    },
  });
}
