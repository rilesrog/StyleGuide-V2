import { useGetStyleProfile } from "@workspace/api-client-react";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession } from "@/context/SessionContext";
import { useMode, type AppMode } from "@/context/ModeContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name, email, isLoggedIn, logout, token } = useUser();
  const { session, isActive, startSession, leaveSession } = useSession();
  const { mode, setMode } = useMode();
  const [startingSession, setStartingSession] = React.useState(false);
  const topInset = insets.top + (Platform.OS === "web" ? 67 : 0);

  const handleModeSelect = async (m: AppMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setMode(m);
    // Keep session mode in sync with user mode
    if (isActive && session?.id && token) {
      fetch(`${API_BASE}/api/sessions/${session.id}/mode`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mode: m }),
      }).catch(() => {});
    }
  };

  const handleStartSession = async () => {
    setStartingSession(true);
    try {
      await startSession();
      router.push("/invite");
    } catch {
    } finally {
      setStartingSession(false);
    }
  };

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

      {/* Mode selector */}
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Mode</Text>
        <View style={[s.modeToggleRow, { backgroundColor: colors.muted }]}>
          <Pressable
            style={[s.modeOption, mode === "decoration" && { backgroundColor: colors.background }]}
            onPress={() => handleModeSelect("decoration")}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={mode === "decoration" ? colors.foreground : colors.mutedForeground}
            />
            <Text style={[s.modeOptionText, { color: mode === "decoration" ? colors.foreground : colors.mutedForeground }]}>
              Home Decoration
            </Text>
          </Pressable>
          <Pressable
            style={[s.modeOption, mode === "registry" && { backgroundColor: colors.background }]}
            onPress={() => handleModeSelect("registry")}
          >
            <Ionicons
              name="gift-outline"
              size={16}
              color={mode === "registry" ? colors.foreground : colors.mutedForeground}
            />
            <Text style={[s.modeOptionText, { color: mode === "registry" ? colors.foreground : colors.mutedForeground }]}>
              Wedding Registry
            </Text>
          </Pressable>
        </View>
        <Text style={[s.modeDescription, { color: colors.mutedForeground }]}>
          {mode === "decoration"
            ? "Sort liked products into room-by-room boards."
            : "Both partners must approve an item for it to join the registry."}
        </Text>
      </View>

      {/* Shared session card */}
      <View style={[s.section, { backgroundColor: colors.card }]}>
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>Shared Session</Text>

        {!session && (
          <Pressable
            style={[s.sessionBtn, { backgroundColor: colors.primary }]}
            onPress={handleStartSession}
            disabled={startingSession}
          >
            {startingSession ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Ionicons name="people-outline" size={18} color={colors.primaryForeground} />
            )}
            <Text style={[s.sessionBtnText, { color: colors.primaryForeground }]}>
              {startingSession ? "Creating…" : "Start a Session"}
            </Text>
          </Pressable>
        )}

        {session && !isActive && (
          <View style={s.sessionStatus}>
            <ActivityIndicator size="small" color={colors.primary} />
            <View style={s.sessionStatusText}>
              <Text style={[s.sessionStatusTitle, { color: colors.foreground }]}>
                Waiting for partner
              </Text>
              <Text style={[s.sessionStatusSub, { color: colors.mutedForeground }]}>
                Share the invite link to get started
              </Text>
            </View>
            <Pressable
              style={[s.sessionSmallBtn, { borderColor: colors.primary }]}
              onPress={() => router.push("/invite")}
            >
              <Text style={[s.sessionSmallBtnText, { color: colors.primary }]}>Invite</Text>
            </Pressable>
          </View>
        )}

        {session && isActive && (
          <View style={s.sessionStatus}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <View style={s.sessionStatusText}>
              <Text style={[s.sessionStatusTitle, { color: colors.foreground }]}>
                Active with {session.partner?.name ?? "partner"}
              </Text>
              <Text style={[s.sessionStatusSub, { color: colors.mutedForeground }]}>
                Swipe together to find matches
              </Text>
            </View>
            <Pressable
              style={[s.sessionSmallBtn, { borderColor: colors.primary }]}
              onPress={() => router.push("/(tabs)/matches")}
            >
              <Text style={[s.sessionSmallBtnText, { color: colors.primary }]}>Matches</Text>
            </Pressable>
          </View>
        )}

        {session && (
          <Pressable onPress={leaveSession}>
            <Text style={[s.endSessionText, { color: colors.mutedForeground }]}>
              End session
            </Text>
          </Pressable>
        )}
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
    sessionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
      width: "100%",
    },
    sessionBtnText: {
      fontSize: 15,
      fontFamily: "Inter_600SemiBold",
    },
    sessionStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    sessionStatusText: {
      flex: 1,
      gap: 2,
    },
    sessionStatusTitle: {
      fontSize: 14,
      fontFamily: "Inter_600SemiBold",
    },
    sessionStatusSub: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
    },
    sessionSmallBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    sessionSmallBtnText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    endSessionText: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      textDecorationLine: "underline",
    },
    modeToggleRow: {
      flexDirection: "row",
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    modeOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
    },
    modeOptionText: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
    },
    modeDescription: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      lineHeight: 19,
    },
  });
}
