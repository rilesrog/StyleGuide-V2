import { useGetStylePhotos, useRecordSwipe } from "@workspace/api-client-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { SwipeCard } from "@/components/SwipeCard";
import { useUser } from "@/context/UserContext";
import { useQueryClient } from "@tanstack/react-query";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const BATCH_SIZE = 20;
const TARGET_YES = 25;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface Photo {
  id: number;
  url: string;
  tags: string[];
}

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isLoggedIn, token, quizCompleted } = useUser();
  const queryClient = useQueryClient();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [yesCount, setYesCount] = useState(0);
  const [completing, setCompleting] = useState(false);
  const isLoadingMore = useRef(false);

  // Guard: completed users should not access the quiz
  useEffect(() => {
    if (quizCompleted) {
      router.replace("/(tabs)");
    }
  }, [quizCompleted]);

  const { data: photosData, isLoading } = useGetStylePhotos(
    { limit: BATCH_SIZE, offset },
    { query: { enabled: isLoggedIn, staleTime: 0 } }
  );

  const recordSwipe = useRecordSwipe();

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

  const completeQuiz = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/style-profile/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/style-profile"] });
      router.replace({ pathname: "/quiz/results", params: { result: JSON.stringify(data.styleResult) } });
    } catch {
      setCompleting(false);
    }
  }, [completing, token, router, queryClient]);

  const handleSwipe = useCallback(
    async (liked: boolean) => {
      const currentPhoto = photos[0];
      if (!currentPhoto) return;

      Haptics.impactAsync(liked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
      setPhotos((prev) => prev.slice(1));

      let nextYesCount = yesCount;
      if (liked) {
        nextYesCount = yesCount + 1;
        setYesCount(nextYesCount);
      }

      try {
        await recordSwipe.mutateAsync({ data: { photoId: currentPhoto.id, liked } });
      } catch {}

      if (nextYesCount >= TARGET_YES) {
        await completeQuiz();
        return;
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
    },
    [photos, offset, totalAvailable, yesCount, recordSwipe, completeQuiz]
  );

  const progress = Math.min(yesCount / TARGET_YES, 1);
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!isLoggedIn) return null;

  if (completing) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.completingText, { color: colors.mutedForeground }]}>Building your style profile…</Text>
      </View>
    );
  }

  if (isLoading && photos.length === 0) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (photos.length === 0 && !isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <View style={[s.doneIcon, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="images-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[s.doneTitle, { color: colors.foreground }]}>More photos coming soon</Text>
        <Text style={[s.doneSubtitle, { color: colors.mutedForeground }]}>
          You've seen all available photos.{"\n"}You need {TARGET_YES - yesCount} more loves to complete the quiz.{"\n"}Check back when new rooms are added!
        </Text>
      </View>
    );
  }

  const cardHeight = SCREEN_HEIGHT * 0.62;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <View style={s.headerTop}>
          <View>
            <Text style={[s.headerTitle, { color: colors.foreground }]}>Style Quiz</Text>
            <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
              Swipe right on rooms you love
            </Text>
          </View>
          <View style={[s.countBadge, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[s.countText, { color: colors.primary }]}>
              {yesCount}<Text style={[s.countGoal, { color: colors.primary + "99" }]}>/{TARGET_YES}</Text>
            </Text>
          </View>
        </View>

        <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              s.progressFill,
              { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
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

      <View style={[s.actions, { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 16 }]}>
        <View style={[s.hintBox, { backgroundColor: colors.card }]}>
          <Ionicons name="close" size={18} color="#E05A45" />
          <Text style={[s.hint, { color: colors.mutedForeground }]}>skip</Text>
          <View style={s.hintDivider} />
          <Text style={[s.hint, { color: colors.mutedForeground }]}>love it</Text>
          <Ionicons name="heart" size={18} color="#4CAF7A" />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 16 },
  header: { paddingHorizontal: 24, paddingBottom: 12, gap: 12 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  countBadge: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  countText: { fontSize: 22, fontFamily: "Inter_700Bold" },
  countGoal: { fontSize: 14 },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  hintDivider: { width: 1, height: 14, backgroundColor: "#00000020", marginHorizontal: 4 },
  completingText: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: 8 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  doneSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  continueBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  continueBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
