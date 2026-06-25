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
  const { isLoggedIn, token, quizCompleted, completeQuiz: markCompleteInContext } = useUser();
  const queryClient = useQueryClient();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [offset, setOffset] = useState(0);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  // Start as null until initialized from persisted state
  const [yesCount, setYesCount] = useState<number | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [resettingDislikes, setResettingDislikes] = useState(false);
  const isLoadingMore = useRef(false);
  const autoCompleteTriggered = useRef(false);

  // Guard: completed users should not access the quiz
  useEffect(() => {
    if (quizCompleted) {
      router.replace("/(tabs)");
    }
  }, [quizCompleted]);

  // On mount: initialize yesCount from persisted liked count
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/api/style-profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const persisted: number = data.likedCount ?? 0;
        setYesCount(persisted);
        // If already at target (e.g. user partially done before), auto-complete
        if (persisted >= TARGET_YES && !autoCompleteTriggered.current) {
          autoCompleteTriggered.current = true;
          triggerComplete();
        }
      })
      .catch(() => setYesCount(0));
  }, [token]);

  const { data: photosData, isLoading, refetch } = useGetStylePhotos(
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

  const triggerComplete = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    setCompletionError(null);
    try {
      const res = await fetch(`${API_BASE}/api/style-profile/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 409) {
        // Already completed server-side — sync client state and exit quiz
        markCompleteInContext();
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setCompletionError((body as any).error ?? "Something went wrong. Please try again.");
        setCompleting(false);
        return;
      }

      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/style-profile"] });
      router.replace({
        pathname: "/quiz/results",
        params: { result: JSON.stringify(data.styleResult) },
      });
    } catch {
      setCompletionError("Network error. Please check your connection and try again.");
      setCompleting(false);
    }
  }, [completing, token, router, queryClient, markCompleteInContext]);

  const handleSwipe = useCallback(
    async (liked: boolean) => {
      const currentPhoto = photos[0];
      if (!currentPhoto || yesCount === null) return;

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
        await triggerComplete();
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
    [photos, offset, totalAvailable, yesCount, recordSwipe, triggerComplete]
  );

  const handleResetDislikes = async () => {
    setResettingDislikes(true);
    try {
      await fetch(`${API_BASE}/api/swipes/dislikes`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      // Reset pagination and reload photos
      setPhotos([]);
      setOffset(0);
      setTotalAvailable(null);
      isLoadingMore.current = false;
      await refetch();
    } catch {}
    setResettingDislikes(false);
  };

  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!isLoggedIn) return null;

  // Waiting for persisted count to load before rendering
  if (yesCount === null) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (completing) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.completingText, { color: colors.mutedForeground }]}>Building your style profile…</Text>
      </View>
    );
  }

  if (completionError) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <View style={[s.doneIcon, { backgroundColor: "#E05A4520" }]}>
          <Ionicons name="alert-circle-outline" size={40} color="#E05A45" />
        </View>
        <Text style={[s.doneTitle, { color: colors.foreground }]}>Something went wrong</Text>
        <Text style={[s.doneSubtitle, { color: colors.mutedForeground }]}>{completionError}</Text>
        <Pressable
          style={[s.actionBtn, { backgroundColor: colors.primary }]}
          onPress={triggerComplete}
        >
          <Text style={[s.actionBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
        </Pressable>
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

  // Photos exhausted before reaching 25 yes — offer to reload dislikes
  if (photos.length === 0 && !isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <View style={[s.doneIcon, { backgroundColor: colors.primary + "20" }]}>
          <Ionicons name="images-outline" size={40} color={colors.primary} />
        </View>
        <Text style={[s.doneTitle, { color: colors.foreground }]}>You've seen them all!</Text>
        <Text style={[s.doneSubtitle, { color: colors.mutedForeground }]}>
          {yesCount} loved so far — need {TARGET_YES - yesCount} more.{"\n"}
          Load skipped photos to keep going.
        </Text>
        <Pressable
          style={[s.actionBtn, { backgroundColor: colors.primary }]}
          onPress={handleResetDislikes}
          disabled={resettingDislikes}
        >
          {resettingDislikes ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text style={[s.actionBtnText, { color: colors.primaryForeground }]}>Load Skipped Photos</Text>
          )}
        </Pressable>
      </View>
    );
  }

  const progress = Math.min((yesCount ?? 0) / TARGET_YES, 1);
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
  actionBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8, minWidth: 180, alignItems: "center" },
  actionBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
