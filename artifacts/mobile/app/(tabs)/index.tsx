import { useGetStylePhotos, useRecordSwipe } from "@workspace/api-client-react";
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
import { useUser } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const BATCH_SIZE = 20;

interface Photo {
  id: number;
  url: string;
  tags: string[];
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useUser();
  const queryClient = useQueryClient();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [swipeCount, setSwipeCount] = useState(0);
  const isLoadingMore = useRef(false);

  const { data: photosData, isLoading, refetch } = useGetStylePhotos(
    { limit: BATCH_SIZE, offset },
    { query: { enabled: isLoggedIn, staleTime: 0 } }
  );

  const recordSwipe = useRecordSwipe();

  // Reset when this tab is focused (e.g., after retake quiz)
  useFocusEffect(
    useCallback(() => {
      if (isDone) {
        refetch().then((result) => {
          const newPhotos = result.data?.photos as Photo[] | undefined;
          if (newPhotos && newPhotos.length > 0) {
            setPhotos(newPhotos);
            setIsDone(false);
            setSwipeCount(0);
            setOffset(0);
            setTotalAvailable(result.data?.total ?? null);
            isLoadingMore.current = false;
          }
        });
      }
    }, [isDone, refetch])
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

  const handleSwipe = useCallback(
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
        // swipe still registered locally
      }

      const remaining = photos.length - 1;
      if (
        remaining < 5 &&
        !isLoadingMore.current &&
        (totalAvailable === null || offset + BATCH_SIZE < totalAvailable)
      ) {
        isLoadingMore.current = true;
        setOffset((o) => o + BATCH_SIZE);
      }

      if (
        remaining === 0 &&
        totalAvailable !== null &&
        offset + BATCH_SIZE >= totalAvailable
      ) {
        setIsDone(true);
      }
    },
    [photos, offset, totalAvailable, recordSwipe, queryClient]
  );

  const handleRetake = () => {
    setPhotos([]);
    setOffset(0);
    setTotalAvailable(null);
    setIsDone(false);
    setSwipeCount(0);
    isLoadingMore.current = false;
    refetch();
  };

  const s = stylesheet(colors);
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!isLoggedIn) return null;

  if (isLoading && photos.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isDone || (photos.length === 0 && !isLoading)) {
    return (
      <View style={[s.center, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={[s.doneIcon, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
        </View>
        <Text style={[s.doneTitle, { color: colors.foreground }]}>Style Quiz Complete</Text>
        <Text style={[s.doneSubtitle, { color: colors.mutedForeground }]}>
          You swiped {swipeCount} photos.{"\n"}Check your Board to see your style!
        </Text>
        <Pressable
          style={[s.retakeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleRetake}
        >
          <Text style={[s.retakeBtnText, { color: colors.foreground }]}>Retake Quiz</Text>
        </Pressable>
      </View>
    );
  }

  const cardHeight = SCREEN_HEIGHT * 0.62;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Discover</Text>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
          {photos.length > 0 ? `${swipeCount} swiped` : "Loading..."}
        </Text>
      </View>

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
            onSwipe={handleSwipe}
            isTop={true}
            index={0}
          />
        )}
      </View>

      <View
        style={[
          s.actions,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 },
        ]}
      >
        <View style={[s.hintBox, { backgroundColor: colors.card }]}>
          <Ionicons name="arrow-back" size={16} color={colors.mutedForeground} />
          <Text style={[s.hint, { color: colors.mutedForeground }]}>
            Swipe left to skip, right to save
          </Text>
          <Ionicons name="arrow-forward" size={16} color={colors.mutedForeground} />
        </View>
      </View>
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 16,
    },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 12,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
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
    doneIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
    doneSubtitle: {
      fontSize: 16,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 24,
    },
    retakeBtn: {
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      marginTop: 8,
    },
    retakeBtnText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  });
}
