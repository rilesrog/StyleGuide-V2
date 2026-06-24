import { useGetStyleBoard, useGetStyleProfile, useResetSwipes } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - 8) / 2;

export default function BoardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isLoggedIn } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: boardData, isLoading: boardLoading } = useGetStyleBoard({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const { data: profileData } = useGetStyleProfile({
    query: { enabled: isLoggedIn, staleTime: 0 },
  });

  const resetSwipesMutation = useResetSwipes();

  const photos = (boardData?.photos ?? []) as Array<{ id: number; url: string; tags: string[] }>;
  const topTags = profileData?.topTags ?? [];
  const tagWeights = (profileData?.tagWeights ?? []) as Array<{
    tag: string;
    score: number;
    count: number;
  }>;

  const handleRetakeQuiz = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const doReset = async () => {
      await resetSwipesMutation.mutateAsync({});
      queryClient.invalidateQueries();
      router.navigate("/");
    };

    if (Platform.OS === "web") {
      if (window.confirm("Reset all swipes and retake the quiz?")) {
        doReset();
      }
    } else {
      Alert.alert(
        "Retake Quiz",
        "This will clear your style board and start fresh. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset & Retake", style: "destructive", onPress: doReset },
        ]
      );
    }
  };

  const s = stylesheet(colors);

  if (!isLoggedIn) return null;

  if (boardLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const ListHeader = () => (
    <View>
      <View style={[s.header, { paddingTop: topInset + 8 }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>My Board</Text>
        {photos.length > 0 && (
          <Text style={[s.headerCount, { color: colors.mutedForeground }]}>
            {photos.length} saved
          </Text>
        )}
      </View>

      {topTags.length > 0 && (
        <View style={[s.profileCard, { backgroundColor: colors.card, marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={[s.profileCardLabel, { color: colors.mutedForeground }]}>Your Style</Text>
          <View style={s.topTagsRow}>
            {topTags.slice(0, 3).map((tag) => (
              <View key={tag} style={[s.topTag, { backgroundColor: colors.primary }]}>
                <Text style={[s.topTagText, { color: colors.primaryForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
          {tagWeights.slice(0, 4).map((tw) => (
            <View key={tw.tag} style={s.tagBar}>
              <Text style={[s.tagBarLabel, { color: colors.foreground }]}>{tw.tag}</Text>
              <View style={[s.tagBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    s.tagBarFill,
                    { backgroundColor: colors.primary, width: `${Math.round(tw.score * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[s.tagBarPct, { color: colors.mutedForeground }]}>
                {Math.round(tw.score * 100)}%
              </Text>
            </View>
          ))}
          <Pressable
            style={[s.retakeBtn, { borderColor: colors.border }]}
            onPress={handleRetakeQuiz}
            disabled={resetSwipesMutation.isPending}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.mutedForeground} />
            <Text style={[s.retakeBtnText, { color: colors.mutedForeground }]}>
              {resetSwipesMutation.isPending ? "Resetting..." : "Retake Quiz"}
            </Text>
          </Pressable>
        </View>
      )}

      {photos.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
          <Text style={[s.emptyTitle, { color: colors.foreground }]}>Your board is empty</Text>
          <Text style={[s.emptySubtitle, { color: colors.mutedForeground }]}>
            Swipe right on photos you love in the Discover tab
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={photos}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        columnWrapperStyle={s.row}
        contentContainerStyle={[
          s.grid,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 },
        ]}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <View style={[s.photoCard, { backgroundColor: colors.card }]}>
            <Image source={{ uri: item.url }} style={s.photo} resizeMode="cover" />
            {item.tags
              .filter(
                (t: string) =>
                  !["neutral", "warm", "light", "dark", "bright", "airy", "clean", "bold", "white"].includes(t)
              )
              .slice(0, 1)
              .map((tag: string) => (
                <View
                  key={tag}
                  style={[s.photoTag, { backgroundColor: colors.background + "DD" }]}
                >
                  <Text style={[s.photoTagText, { color: colors.foreground }]}>{tag}</Text>
                </View>
              ))}
          </View>
        )}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!photos.length}
      />
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    header: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
    },
    headerTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
    headerCount: { fontSize: 14, fontFamily: "Inter_400Regular" },
    profileCard: { borderRadius: 20, padding: 20, gap: 12 },
    profileCardLabel: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    topTagsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    topTag: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
    topTagText: { fontSize: 13, fontFamily: "Inter_600SemiBold", textTransform: "capitalize" },
    tagBar: { flexDirection: "row", alignItems: "center", gap: 10 },
    tagBarLabel: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      textTransform: "capitalize",
      width: 90,
    },
    tagBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
    tagBarFill: { height: "100%", borderRadius: 3 },
    tagBarPct: { fontSize: 12, fontFamily: "Inter_400Regular", width: 34, textAlign: "right" },
    retakeBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: 4,
    },
    retakeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
    emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
    emptyTitle: { fontSize: 20, fontFamily: "Inter_600SemiBold", textAlign: "center" },
    emptySubtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
    },
    grid: { paddingHorizontal: 16 },
    row: { gap: 8, marginBottom: 8 },
    photoCard: {
      width: CARD_WIDTH,
      height: CARD_WIDTH * 1.3,
      borderRadius: 16,
      overflow: "hidden",
    },
    photo: { width: "100%", height: "100%" },
    photoTag: {
      position: "absolute",
      bottom: 8,
      left: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    photoTagText: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "capitalize" },
  });
}
