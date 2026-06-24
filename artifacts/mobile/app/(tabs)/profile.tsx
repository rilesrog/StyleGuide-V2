import { useGetStyleProfile } from "@workspace/api-client-react";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { name, email, isLoggedIn, logout } = useUser();
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const { data: profileData } = useGetStyleProfile({
    query: { enabled: isLoggedIn, staleTime: 0 }
  });

  const tagWeights = (profileData?.tagWeights ?? []) as Array<{ tag: string; score: number; count: number }>;
  const totalSwipes = profileData?.totalSwipes ?? 0;
  const likedCount = profileData?.likedCount ?? 0;

  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  };

  const s = stylesheet(colors);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[s.content, { paddingTop: topInset + 8, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 80 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[s.headerTitle, { color: colors.foreground }]}>Profile</Text>

      <View style={[s.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[s.avatarText, { color: colors.primaryForeground }]}>{initials}</Text>
      </View>

      <Text style={[s.name, { color: colors.foreground }]}>{name ?? "User"}</Text>
      <Text style={[s.email, { color: colors.mutedForeground }]}>{email ?? ""}</Text>

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

      {tagWeights.length > 0 && (
        <View style={[s.section, { backgroundColor: colors.card }]}>
          <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Your Style DNA</Text>
          {tagWeights.slice(0, 6).map((tw, i) => (
            <View key={tw.tag} style={s.tagRow}>
              <View style={s.tagRank}>
                <Text style={[s.rankNum, { color: i < 3 ? colors.primary : colors.mutedForeground }]}>#{i + 1}</Text>
              </View>
              <Text style={[s.tagName, { color: colors.foreground }]}>{tw.tag}</Text>
              <View style={[s.barTrack, { backgroundColor: colors.border }]}>
                <View style={[s.barFill, { backgroundColor: colors.primary, width: `${Math.round(tw.score * 100)}%` }]} />
              </View>
              <Text style={[s.tagScore, { color: colors.mutedForeground }]}>{Math.round(tw.score * 100)}%</Text>
            </View>
          ))}
        </View>
      )}

      {tagWeights.length === 0 && (
        <View style={[s.section, { backgroundColor: colors.card, alignItems: "center", paddingVertical: 32 }]}>
          <Ionicons name="sparkles-outline" size={32} color={colors.mutedForeground} />
          <Text style={[s.emptyStyle, { color: colors.mutedForeground }]}>
            Swipe some photos to build your style profile
          </Text>
        </View>
      )}

      <Pressable
        style={[s.logoutBtn, { borderColor: colors.destructive + "60" }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        <Text style={[s.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function stylesheet(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
      alignItems: "center",
      gap: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: "Inter_700Bold",
      alignSelf: "flex-start",
      marginBottom: 8,
    },
    avatar: {
      width: 88,
      height: 88,
      borderRadius: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 32,
      fontFamily: "Inter_700Bold",
    },
    name: {
      fontSize: 22,
      fontFamily: "Inter_600SemiBold",
      marginTop: -4,
    },
    email: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      marginTop: -8,
    },
    statsRow: {
      flexDirection: "row",
      borderRadius: 20,
      paddingVertical: 20,
      width: "100%",
    },
    stat: {
      flex: 1,
      alignItems: "center",
      gap: 4,
    },
    statNum: {
      fontSize: 24,
      fontFamily: "Inter_700Bold",
    },
    statLabel: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    statDivider: {
      width: 1,
      marginVertical: 4,
    },
    section: {
      borderRadius: 20,
      padding: 20,
      width: "100%",
      gap: 14,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_500Medium",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    tagRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    tagRank: {
      width: 28,
    },
    rankNum: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
    },
    tagName: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textTransform: "capitalize",
      width: 80,
    },
    barTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
    },
    barFill: {
      height: "100%",
      borderRadius: 3,
    },
    tagScore: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      width: 34,
      textAlign: "right",
    },
    emptyStyle: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
      marginTop: 8,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1.5,
      width: "100%",
      justifyContent: "center",
      marginTop: 8,
    },
    logoutText: {
      fontSize: 16,
      fontFamily: "Inter_500Medium",
    },
  });
}
