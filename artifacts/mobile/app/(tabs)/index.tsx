import {
  useGetStylePhotos,
  useRecordSwipe,
} from "@workspace/api-client-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { SwipeCard, type SwipeCardRef } from "@/components/SwipeCard";
import { useUser } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";

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

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [isDonePhotos, setIsDonePhotos] = useState(false);
  const isLoadingMore = useRef(false);
  const topPhotoCardRef = useRef<SwipeCardRef>(null);

  const { data: photosData, isLoading: photosLoading, refetch: refetchPhotos } = useGetStylePhotos(
    { limit: BATCH_SIZE, offset },
    { query: { enabled: isLoggedIn, staleTime: 0 } }
  );

  const recordSwipe = useRecordSwipe();

  useFocusEffect(
    useCallback(() => {
      if (isDonePhotos) {
        refetchPhotos().then((result) => {
          const newPhotos = result.data?.photos as Photo[] | undefined;
          if (newPhotos && newPhotos.length > 0) {
            setPhotos(newPhotos);
            setIsDonePhotos(false);
            setOffset(0);
            setTotalAvailable(result.data?.total ?? null);
            isLoadingMore.current = false;
          }
        });
      }
    }, [isDonePhotos, refetchPhotos])
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

  const s = stylesheet(colors);
  const bottomPad = insets.bottom + (Platform.OS === "web" ? 90 : 80);

  if (!isLoggedIn) return null;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>Discover</Text>
      </View>

      {photosLoading && photos.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isDonePhotos || (photos.length === 0 && !photosLoading) ? (
        <View style={s.center}>
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
          <View style={s.deckArea}>
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
                ref={topPhotoCardRef}
                key={photos[0].id}
                photoUrl={photos[0].url}
                tags={photos[0].tags}
                onSwipe={handlePhotoSwipe}
                isTop={true}
                index={0}
              />
            )}
          </View>
          <View style={[s.actionBar, { paddingBottom: bottomPad }]}>
            <Pressable
              style={[s.actionBtn, { backgroundColor: colors.card, borderColor: "#E05A45", borderWidth: 2 }]}
              onPress={() => topPhotoCardRef.current?.triggerSwipe(false)}
              hitSlop={12}
            >
              <Ionicons name="close" size={30} color="#E05A45" />
            </Pressable>
            <Pressable
              style={[s.actionBtn, { backgroundColor: colors.primary }]}
              onPress={() => topPhotoCardRef.current?.triggerSwipe(true)}
              hitSlop={12}
            >
              <Ionicons name="heart" size={26} color={colors.primaryForeground} />
            </Pressable>
          </View>
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
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    deckArea: {
      flex: 1,
      marginHorizontal: 16,
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    actionBar: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 48,
      paddingTop: 16,
    },
    actionBtn: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    doneIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
    doneSubtitle: { fontSize: 16, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  });
}
