import {
  useGetStylePhotos,
  useRecordSwipe,
  useGetProductFeed,
  useRecordProductSwipe,
} from "@workspace/api-client-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { SwipeCard } from "@/components/SwipeCard";
import { ProductCard } from "@/components/ProductCard";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode } from "@/context/ModeContext";
import { useQueryClient } from "@tanstack/react-query";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const BATCH_SIZE = 20;
const PRODUCT_BATCH = 200;

type Segment = "inspire" | "shop";

interface Photo {
  id: number;
  url: string;
  tags: string[];
}

type Product = {
  id: number;
  url: string;
  name: string;
  price: number;
  tags: string[];
  category: string;
  brand?: string | null;
  affiliateUrl?: string | null;
};

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useUser();
  const { session, isActive } = useSession();
  const { isRegistry } = useMode();
  const queryClient = useQueryClient();

  const [segment, setSegment] = useState<Segment>("inspire");
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  // ── Inspire (photo) state ──────────────────────────────────────────────────
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [isDonePhotos, setIsDonePhotos] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const isLoadingMore = useRef(false);

  const { data: photosData, isLoading: photosLoading, refetch: refetchPhotos } = useGetStylePhotos(
    { limit: BATCH_SIZE, offset },
    { query: { enabled: isLoggedIn, staleTime: 0 } }
  );

  const recordSwipe = useRecordSwipe();

  useFocusEffect(
    useCallback(() => {
      if (isDonePhotos && segment === "inspire") {
        refetchPhotos().then((result) => {
          const newPhotos = result.data?.photos as Photo[] | undefined;
          if (newPhotos && newPhotos.length > 0) {
            setPhotos(newPhotos);
            setIsDonePhotos(false);
            setSwipeCount(0);
            setOffset(0);
            setTotalAvailable(result.data?.total ?? null);
            isLoadingMore.current = false;
          }
        });
      }
    }, [isDonePhotos, segment, refetchPhotos])
  );

  useEffect(() => {
    if (photosData?.photos) {
      const newPhotos = photosData.photos as Photo[];
      setPhotos((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const unique = newPhotos.filter((p) => !existingIds.has(p.id));
        return [...prev, ...unique];
      });
      if (totalAvailable === null) {
        setTotalAvailable(photosData.total);
      }
      isLoadingMore.current = false;
    }
  }, [photosData]);

  const handlePhotoSwipe = useCallback(
    async (liked: boolean) => {
      const currentPhoto = photos[0];
      if (!currentPhoto) return;

      Haptics.impactAsync(liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      setPhotos((prev) => prev.slice(1));
      setSwipeCount((c) => c + 1);

      try {
        await recordSwipe.mutateAsync({ data: { photoId: currentPhoto.id, liked } });
        queryClient.invalidateQueries({ queryKey: ["/api/style-profile"] });
        queryClient.invalidateQueries({ queryKey: ["/api/style-board"] });
      } catch {
        // silent
      }

      const remaining = photos.length - 1;
      if (remaining < 5 && !isLoadingMore.current &&
        (totalAvailable === null || offset + BATCH_SIZE < totalAvailable)) {
        isLoadingMore.current = true;
        setOffset((o) => o + BATCH_SIZE);
      }
      if (remaining === 0 && totalAvailable !== null && offset + BATCH_SIZE >= totalAvailable) {
        setIsDonePhotos(true);
      }
    },
    [photos, offset, totalAvailable, recordSwipe, queryClient]
  );

  // ── Shop (product) state ───────────────────────────────────────────────────
  const [deck, setDeck] = useState<Product[]>([]);
  const [isDoneProducts, setIsDoneProducts] = useState(false);
  const swipeInFlight = useRef(false);
  const hasFetched = useRef(false);

  const sessionId = isActive && session ? session.id : undefined;

  const { data: feedData, isLoading: feedLoading, refetch: refetchFeed } = useGetProductFeed(
    { limit: PRODUCT_BATCH, offset: 0, ...(sessionId ? { sessionId } : {}) },
    { query: { enabled: isLoggedIn && segment === "shop", staleTime: 0 } }
  );

  const swipeMutation = useRecordProductSwipe();

  const prevSessionRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (prevSessionRef.current === sessionId) return;
    prevSessionRef.current = sessionId;
    hasFetched.current = false;
    setIsDoneProducts(false);
    setDeck([]);
  }, [sessionId]);

  useEffect(() => {
    if (!feedData) return;
    if (hasFetched.current) return;
    hasFetched.current = true;
    const incoming = (feedData.products ?? []) as Product[];
    if (incoming.length === 0) {
      setIsDoneProducts(true);
    } else {
      setDeck(incoming);
    }
  }, [feedData]);

  const resetDeck = useCallback(() => {
    hasFetched.current = false;
    setIsDoneProducts(false);
    setDeck([]);
    refetchFeed();
  }, [refetchFeed]);

  const handleProductSwipe = useCallback(
    async (product: Product, liked: boolean) => {
      if (swipeInFlight.current) return;
      swipeInFlight.current = true;
      if (Platform.OS !== "web") {
        Haptics.impactAsync(
          liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
        );
      }
      setDeck((prev) => {
        const next = prev.filter((p) => p.id !== product.id);
        if (next.length === 0) setIsDoneProducts(true);
        return next;
      });
      try {
        await swipeMutation.mutateAsync({
          data: { productId: product.id, liked, ...(sessionId ? { sessionId } : {}) },
        });
        if (liked) {
          queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
        }
      } catch {
        // silent
      } finally {
        swipeInFlight.current = false;
      }
    },
    [swipeMutation, queryClient, sessionId]
  );

  const s = stylesheet(colors);

  if (!isLoggedIn) return null;

  const cardHeight = SCREEN_HEIGHT * 0.62;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Discover</Text>
        <View style={[s.segmentToggle, { backgroundColor: colors.muted }]}>
          <Pressable
            style={[s.segmentOption, segment === "inspire" && { backgroundColor: colors.background }]}
            onPress={() => setSegment("inspire")}
          >
            <Ionicons name="sparkles-outline" size={14} color={segment === "inspire" ? colors.foreground : colors.mutedForeground} />
            <Text style={[s.segmentOptionText, { color: segment === "inspire" ? colors.foreground : colors.mutedForeground }]}>
              Inspire
            </Text>
          </Pressable>
          <Pressable
            style={[s.segmentOption, segment === "shop" && { backgroundColor: colors.background }]}
            onPress={() => setSegment("shop")}
          >
            <Ionicons name="bag-outline" size={14} color={segment === "shop" ? colors.foreground : colors.mutedForeground} />
            <Text style={[s.segmentOptionText, { color: segment === "shop" ? colors.foreground : colors.mutedForeground }]}>
              Shop
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ── Inspire segment ── */}
      {segment === "inspire" && (
        <>
          {photosLoading && photos.length === 0 ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : isDonePhotos || (photos.length === 0 && !photosLoading) ? (
            <View style={[s.center, { paddingTop: 40 }]}>
              <View style={[s.doneIcon, { backgroundColor: colors.primary + "20" }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
              </View>
              <Text style={[s.doneTitle, { color: colors.foreground }]}>All caught up!</Text>
              <Text style={[s.doneSubtitle, { color: colors.mutedForeground }]}>
                You've seen all available photos.{"\n"}Check back soon for fresh inspiration.
              </Text>
            </View>
          ) : (
            <>
              <View style={[s.deckArea, { height: cardHeight }]}>
                {photos.length >= 2 && (
                  <SwipeCard
                    key={photos[1].id + "_behind"}
                    photoUrl={photos[1].url}
                    tags={photos[1].tags}
                    onSwipe={() => {}}
                    isTop={false}
                    index={1}
                  />
                )}
                {photos.length >= 1 && (
                  <SwipeCard
                    key={photos[0].id}
                    photoUrl={photos[0].url}
                    tags={photos[0].tags}
                    onSwipe={handlePhotoSwipe}
                    isTop={true}
                    index={0}
                  />
                )}
              </View>
              <View style={[s.actions, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}>
                <View style={[s.hintBox, { backgroundColor: colors.card }]}>
                  <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
                  <Text style={[s.hint, { color: colors.mutedForeground }]}>
                    Swipe left to skip, right to save · {swipeCount} swiped
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
                </View>
              </View>
            </>
          )}
        </>
      )}

      {/* ── Shop segment ── */}
      {segment === "shop" && (
        <>
          {session && isActive && (
            <View style={[s.sessionPill, { backgroundColor: colors.card, marginHorizontal: 24, marginBottom: 4 }]}>
              <Text style={[s.sessionPillDot, { color: "#4CAF50" }]}>●</Text>
              <Text style={[s.sessionPillText, { color: colors.mutedForeground }]}>
                Session with {session.partner?.name ?? "partner"}
              </Text>
            </View>
          )}
          <View style={[s.deckArea, { height: cardHeight }]}>
            {feedLoading && deck.length === 0 ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : isDoneProducts || deck.length === 0 ? (
              <View style={s.center}>
                <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
                <Text style={[s.doneTitle, { color: colors.foreground }]}>All caught up!</Text>
                <Text style={[s.doneSubtitle, { color: colors.mutedForeground }]}>
                  You've seen all products for your style.
                </Text>
                <Pressable style={[s.reloadBtn, { backgroundColor: colors.primary }]} onPress={resetDeck}>
                  <Ionicons name="refresh-outline" size={18} color={colors.primaryForeground} />
                  <Text style={[s.reloadBtnText, { color: colors.primaryForeground }]}>Browse Again</Text>
                </Pressable>
              </View>
            ) : (
              deck.slice(0, 2).reverse().map((product, revIdx) => {
                const isTop = revIdx === deck.slice(0, 2).length - 1;
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isTop={isTop}
                    onSwipe={(liked) => handleProductSwipe(product, liked)}
                    saveLabel={isRegistry ? "ADD" : "SAVE"}
                    skipLabel="SKIP"
                  />
                );
              })
            )}
          </View>
          {!isDoneProducts && deck.length > 0 && (
            <View style={[s.shopHint, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}>
              <Ionicons name="arrow-back-outline" size={16} color={colors.mutedForeground} />
              <Text style={[s.hint, { color: colors.mutedForeground }]}>skip</Text>
              <View style={s.hintSpacer} />
              <Text style={[s.hint, { color: colors.mutedForeground }]}>
                {isRegistry ? "add to registry" : "save"}
              </Text>
              <Ionicons name="arrow-forward-outline" size={16} color={colors.mutedForeground} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    segmentToggle: {
      flexDirection: "row",
      borderRadius: 20,
      padding: 3,
      gap: 2,
    },
    segmentOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 18,
    },
    segmentOptionText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    deckArea: {
      marginHorizontal: 16,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    actions: { paddingHorizontal: 24, paddingTop: 16, alignItems: "center" },
    hintBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    hint: { fontSize: 13, fontFamily: "Inter_400Regular" },
    shopHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 12,
      paddingHorizontal: 32,
      gap: 6,
    },
    hintSpacer: { flex: 1 },
    doneIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
    doneSubtitle: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
    reloadBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      marginTop: 4,
    },
    reloadBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    sessionPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    sessionPillDot: { fontSize: 10 },
    sessionPillText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  });
}
