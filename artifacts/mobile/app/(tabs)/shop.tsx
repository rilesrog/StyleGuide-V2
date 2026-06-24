import { useGetProductFeed, useRecordProductSwipe } from "@workspace/api-client-react";
import React, { useCallback, useRef, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { ProductCard } from "@/components/ProductCard";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type Product = {
  id: number;
  url: string;
  name: string;
  price: number;
  tags: string[];
  category: string;
  brand?: string | null;
  source?: string | null;
  affiliateUrl?: string | null;
};

export default function ShopScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useUser();
  const { session, isActive } = useSession();
  const queryClient = useQueryClient();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const sessionId = isActive && session ? session.id : undefined;

  // deck = local ranked list of unswiped products from this fetch
  const [deck, setDeck] = useState<Product[]>([]);
  const [isDone, setIsDone] = useState(false);
  const swipeInFlight = useRef(false);
  const hasFetched = useRef(false);

  // Always fetch from offset 0 with a large limit — pagination against a changing
  // filter set causes skipped products; instead we load all ranked candidates at once
  // and maintain deck state client-side.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, refetch } = useGetProductFeed(
    { limit: 200, offset: 0, ...(sessionId ? { sessionId } : {}) } as any,
    { query: { enabled: isLoggedIn, staleTime: 0 } }
  );

  const swipeMutation = useRecordProductSwipe();

  // Reset deck whenever the session context changes (solo ↔ shared session)
  const prevSessionIdRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (prevSessionIdRef.current === sessionId) return;
    prevSessionIdRef.current = sessionId;
    hasFetched.current = false;
    setIsDone(false);
    setDeck([]);
    refetch();
  }, [sessionId, refetch]);

  React.useEffect(() => {
    if (!data) return;
    if (hasFetched.current) return; // only seed deck from initial fetch
    hasFetched.current = true;

    const incoming = (data.products ?? []) as Product[];
    if (incoming.length === 0) {
      setIsDone(true);
    } else {
      setDeck(incoming);
    }
  }, [data]);

  const resetDeck = useCallback(() => {
    hasFetched.current = false;
    setIsDone(false);
    setDeck([]);
    refetch();
  }, [refetch]);

  useFocusEffect(
    useCallback(() => {
      // If user retook quiz from board, reset shop deck
      if (isDone && !hasFetched.current) {
        resetDeck();
      }
    }, [isDone, resetDeck])
  );

  const handleSwipe = useCallback(
    async (product: Product, liked: boolean) => {
      if (swipeInFlight.current) return;
      swipeInFlight.current = true;

      if (Platform.OS !== "web") {
        Haptics.impactAsync(
          liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
        );
      }

      // Remove swiped card from local deck immediately — no re-fetch needed
      setDeck((prev) => {
        const next = prev.filter((p) => p.id !== product.id);
        if (next.length === 0) setIsDone(true);
        return next;
      });

      try {
        await swipeMutation.mutateAsync({
          data: { productId: product.id, liked, ...(sessionId ? { sessionId } : {}) },
        });
        if (liked) {
          queryClient.invalidateQueries({ queryKey: ["/api/products/board"] });
        }
      } catch {
        // swipe failed silently; card is already removed from deck
      } finally {
        swipeInFlight.current = false;
      }
    },
    [swipeMutation, queryClient]
  );

  if (!isLoggedIn) return null;

  const cardAreaHeight = SCREEN_HEIGHT - topInset - insets.bottom - 160;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Shop</Text>
        {session && isActive ? (
          <View style={styles.sessionPill}>
            <Text style={[styles.sessionPillDot, { color: "#4CAF50" }]}>●</Text>
            <Text style={[styles.sessionPillText, { color: colors.mutedForeground }]}>
              Session with {session.partner?.name ?? "partner"}
            </Text>
          </View>
        ) : (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {deck.length > 0 ? `${deck.length} picks for your style` : "Curated for your style"}
          </Text>
        )}
      </View>

      <View style={[styles.cardArea, { height: cardAreaHeight }]}>
        {isLoading && deck.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isDone || deck.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={64} color={colors.primary} />
            <Text style={[styles.doneTitle, { color: colors.foreground }]}>All caught up!</Text>
            <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>
              You've seen all the products for your style.
            </Text>
            <Pressable
              style={[styles.reloadBtn, { backgroundColor: colors.primary }]}
              onPress={resetDeck}
            >
              <Ionicons name="refresh-outline" size={18} color={colors.primaryForeground} />
              <Text style={[styles.reloadBtnText, { color: colors.primaryForeground }]}>
                Browse Again
              </Text>
            </Pressable>
          </View>
        ) : (
          deck
            .slice(0, 2)
            .reverse()
            .map((product, revIdx) => {
              const isTop = revIdx === deck.slice(0, 2).length - 1;
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  isTop={isTop}
                  onSwipe={(liked) => handleSwipe(product, liked)}
                />
              );
            })
        )}
      </View>

      {!isDone && deck.length > 0 && (
        <View
          style={[
            styles.hint,
            {
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80,
            },
          ]}
        >
          <Ionicons name="arrow-back-outline" size={16} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>skip</Text>
          <View style={styles.hintSpacer} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>save</Text>
          <Ionicons name="arrow-forward-outline" size={16} color={colors.mutedForeground} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  cardArea: {
    marginHorizontal: 16,
    position: "relative",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  doneTitle: {
    fontSize: 22,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
  doneSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  reloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  reloadBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingHorizontal: 32,
    gap: 6,
  },
  hintText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  hintSpacer: { flex: 1 },
  sessionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  sessionPillDot: {
    fontSize: 10,
  },
  sessionPillText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
});
