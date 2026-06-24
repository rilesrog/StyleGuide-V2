import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import { useMode } from "@/context/ModeContext";

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
  affiliateUrl?: string | null;
};

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useUser();
  const { session, isActive } = useSession();
  const { isRegistry } = useMode();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [matches, setMatches] = useState<MatchedProduct[]>([]);
  const [pending, setPending] = useState<MatchedProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [prevMatchCount, setPrevMatchCount] = useState(0);
  const celebrationAnim = React.useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    if (!session || !isActive || !token) return;
    try {
      if (isRegistry) {
        const resp = await fetch(`${API_BASE}/api/sessions/${session.id}/registry`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const newMatches = (data as { products: MatchedProduct[]; pending: MatchedProduct[] }).products ?? [];
          const newPending = (data as { products: MatchedProduct[]; pending: MatchedProduct[] }).pending ?? [];
          // Trigger celebration if new matches appeared
          if (newMatches.length > prevMatchCount && prevMatchCount > 0) {
            Animated.sequence([
              Animated.timing(celebrationAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.timing(celebrationAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start();
          }
          setPrevMatchCount(newMatches.length);
          setMatches(newMatches);
          setPending(newPending);
        }
      } else {
        const resp = await fetch(`${API_BASE}/api/sessions/${session.id}/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setMatches((data as { products: MatchedProduct[] }).products ?? []);
          setPending([]);
        }
      }
    } catch {}
  }, [session?.id, isActive, token, isRegistry, prevMatchCount]);

  // Reset and poll when session or mode changes
  useEffect(() => {
    if (!isActive) {
      setMatches([]);
      setPending([]);
      setPrevMatchCount(0);
      return;
    }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [isActive, fetchData]);

  const handleShareRegistry = async () => {
    if (!session) return;
    try {
      // Fetch the plain-text export
      const resp = await fetch(`${API_BASE}/api/sessions/${session.id}/registry/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const text = await resp.text();
        await Share.share({ message: text, title: "Wedding Registry" });
      }
    } catch {}
  };

  const s = stylesheet(colors);

  const screenTitle = isRegistry ? "Registry" : "Matches";

  return (
    <View style={[s.wrapper, { backgroundColor: colors.background }]}>
      {/* New-match celebration burst — scales in/out above the title */}
      <Animated.View
        style={[
          s.celebrationOverlay,
          {
            opacity: celebrationAnim,
            transform: [
              {
                scale: celebrationAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.3, 0.8],
                }),
              },
            ],
            pointerEvents: "none",
          },
        ]}
      >
        <Text style={s.celebrationEmoji}>🎉</Text>
        <Text style={[s.celebrationText, { color: colors.primary }]}>New match!</Text>
      </Animated.View>

    <ScrollView
      style={s.container}
      contentContainerStyle={[
        s.content,
        {
          paddingTop: topInset + 8,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.titleRow}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>{screenTitle}</Text>
        {isRegistry && isActive && session && (
          <Pressable
            style={[s.shareBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleShareRegistry}
          >
            <Ionicons name="share-outline" size={16} color={colors.foreground} />
            <Text style={[s.shareBtnText, { color: colors.foreground }]}>Share</Text>
          </Pressable>
        )}
      </View>

      {/* No session */}
      {!session && (
        <View style={s.emptyState}>
          <Ionicons
            name={isRegistry ? "gift-outline" : "heart-circle-outline"}
            size={72}
            color={colors.mutedForeground}
          />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>
            {isRegistry ? "Start Your Registry" : "Find Your Matches"}
          </Text>
          <Text style={[s.emptySub, { color: colors.mutedForeground }]}>
            {isRegistry
              ? "Start a shared session so both of you can approve items for the registry."
              : "Start a shared session with your partner and swipe together to discover what you both love."}
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
              <Text style={[s.bannerTitle, { color: colors.foreground }]}>
                {isRegistry ? "Registry active" : "Session active"}
              </Text>
              <Text style={[s.bannerSub, { color: colors.mutedForeground }]}>
                {isRegistry
                  ? `Building registry with ${session.partner?.name ?? "partner"}`
                  : `Swiping with ${session.partner?.name ?? "partner"}`}
              </Text>
            </View>
            <View style={[s.avatar, { backgroundColor: colors.primary + "55" }]}>
              <Text style={[s.avatarText, { color: colors.primaryForeground }]}>
                {(session.partner?.name ?? "P").charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          {loading && matches.length === 0 && pending.length === 0 ? (
            <ActivityIndicator size="large" color={colors.primary} style={s.spinner} />
          ) : (
            <>
              {/* Registry mode: mutual approval section */}
              {isRegistry && (
                <>
                  <View style={s.sectionHeader}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                    <Text style={[s.sectionHeaderText, { color: colors.foreground }]}>
                      Both approve
                    </Text>
                    <Text style={[s.sectionCount, { color: colors.mutedForeground }]}>
                      {matches.length}
                    </Text>
                  </View>

                  {matches.length === 0 ? (
                    <View style={s.miniEmpty}>
                      <Text style={[s.miniEmptyText, { color: colors.mutedForeground }]}>
                        Swipe right on products together — items you both love appear here.
                      </Text>
                    </View>
                  ) : (
                    <View style={s.grid}>
                      {matches.map((product) => (
                        <MatchCard
                          key={product.id}
                          product={product}
                          colors={colors}
                          badge="check"
                        />
                      ))}
                    </View>
                  )}

                  {/* Waiting on partner section */}
                  {pending.length > 0 && (
                    <>
                      <View style={[s.sectionHeader, { marginTop: 8 }]}>
                        <Ionicons name="time-outline" size={18} color={colors.mutedForeground} />
                        <Text style={[s.sectionHeaderText, { color: colors.foreground }]}>
                          Waiting on partner
                        </Text>
                        <Text style={[s.sectionCount, { color: colors.mutedForeground }]}>
                          {pending.length}
                        </Text>
                      </View>
                      <View style={s.grid}>
                        {pending.map((product) => (
                          <MatchCard
                            key={product.id}
                            product={product}
                            colors={colors}
                            badge="pending"
                          />
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Decoration/style mode: plain matches list */}
              {!isRegistry && (
                <>
                  {matches.length === 0 ? (
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
                          <MatchCard key={product.id} product={product} colors={colors} badge="heart" />
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
    </View>
  );
}

function MatchCard({
  product,
  colors,
  badge,
}: {
  product: MatchedProduct;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  badge: "heart" | "check" | "pending";
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
    badgeWrap: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor:
        badge === "check" ? "#4CAF50" : badge === "pending" ? colors.muted : "#E91E63",
    },
    pendingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.25)",
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
        {badge === "pending" && <View style={s.pendingOverlay} />}
        <View style={s.badgeWrap}>
          {badge === "heart" && <Ionicons name="heart" size={12} color="#fff" />}
          {badge === "check" && <Ionicons name="checkmark" size={14} color="#fff" />}
          {badge === "pending" && <Ionicons name="time" size={12} color={colors.mutedForeground} />}
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
    wrapper: { flex: 1 },
    container: { flex: 1 },
    content: { paddingHorizontal: 24, gap: 16 },
    celebrationOverlay: {
      position: "absolute",
      top: 80,
      left: 0,
      right: 0,
      zIndex: 99,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    celebrationEmoji: {
      fontSize: 48,
    },
    celebrationText: {
      fontSize: 20,
      fontFamily: "Inter_700Bold",
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    shareBtnText: {
      fontSize: 14,
      fontFamily: "Inter_500Medium",
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
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    sectionHeaderText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
      flex: 1,
    },
    sectionCount: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
    },
    miniEmpty: {
      paddingVertical: 16,
      paddingHorizontal: 8,
    },
    miniEmptyText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      lineHeight: 21,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: CARD_GAP,
    },
  });
}
