import React from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { useSession } from "@/context/SessionContext";

export default function InviteScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, inviteUrl, isActive } = useSession();

  if (!session) {
    router.replace("/(tabs)");
    return null;
  }

  const qrUrl = inviteUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(inviteUrl)}&bgcolor=FFFFFF&color=000000&margin=10`
    : null;

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Share.share({
        message: `Join my StyleSwipe session! Tap to swipe together: ${inviteUrl}`,
        url: inviteUrl ?? "",
        title: "StyleSwipe Invite",
      });
    } catch {}
  };

  const handleCopy = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteUrl ?? "").catch(() => {});
    }
  };

  const handleEmailInvite = async () => {
    const subject = encodeURIComponent("Join my StyleSwipe session");
    const body = encodeURIComponent(
      `Hi! I'd love to swipe through home décor together on StyleSwipe.\n\nJoin my session here: ${inviteUrl}`
    );
    await Linking.openURL(`mailto:?subject=${subject}&body=${body}`).catch(() => {});
  };

  const handleSmsInvite = async () => {
    const body = encodeURIComponent(
      `Join my StyleSwipe session and swipe together! ${inviteUrl}`
    );
    await Linking.openURL(`sms:?body=${body}`).catch(() => {});
  };

  const s = stylesheet(colors);

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        s.content,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable style={s.closeBtn} onPress={() => router.back()}>
        <Ionicons name="close" size={24} color={colors.foreground} />
      </Pressable>

      <Text style={[s.title, { color: colors.foreground }]}>Invite Your Partner</Text>
      <Text style={[s.subtitle, { color: colors.mutedForeground }]}>
        Scan the QR code or share the link to swipe together
      </Text>

      {/* QR Code — only shown while waiting */}
      {qrUrl && !isActive && (
        <View style={s.qrContainer}>
          <Image source={{ uri: qrUrl }} style={s.qrImage} resizeMode="contain" />
        </View>
      )}

      {/* Status card */}
      {isActive ? (
        <View style={[s.connectedCard, { backgroundColor: colors.card }]}>
          <Ionicons name="checkmark-circle" size={52} color="#4CAF50" />
          <Text style={[s.connectedTitle, { color: colors.foreground }]}>Connected!</Text>
          <Text style={[s.connectedSub, { color: colors.mutedForeground }]}>
            {session.partner?.name ?? "Your partner"} has joined the session
          </Text>
          <Pressable
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.replace("/(tabs)/matches")}
          >
            <Ionicons name="heart" size={18} color={colors.primaryForeground} />
            <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>
              View Matches
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[s.waitingCard, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[s.waitingText, { color: colors.mutedForeground }]}>
            Waiting for your partner to join…
          </Text>
        </View>
      )}

      {/* Copyable URL */}
      {inviteUrl && !isActive && (
        <Pressable
          style={[s.urlBox, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleCopy}
        >
          <Text style={[s.urlText, { color: colors.mutedForeground }]} numberOfLines={1}>
            {inviteUrl}
          </Text>
          <Ionicons name="copy-outline" size={16} color={colors.mutedForeground} />
        </Pressable>
      )}

      {/* Share buttons */}
      {!isActive && (
        <>
          <Pressable
            style={[s.shareBtn, { backgroundColor: colors.primary }]}
            onPress={handleEmailInvite}
          >
            <Ionicons name="mail-outline" size={20} color={colors.primaryForeground} />
            <Text style={[s.shareBtnText, { color: colors.primaryForeground }]}>
              Invite via Email
            </Text>
          </Pressable>
          <Pressable
            style={[s.shareBtn, { backgroundColor: colors.secondary }]}
            onPress={handleSmsInvite}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.secondaryForeground} />
            <Text style={[s.shareBtnText, { color: colors.secondaryForeground }]}>
              Invite via SMS
            </Text>
          </Pressable>
          <Pressable
            style={[s.shareBtn, { backgroundColor: colors.muted }]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={20} color={colors.mutedForeground} />
            <Text style={[s.shareBtnText, { color: colors.mutedForeground }]}>
              More Options
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: {
      paddingHorizontal: 24,
      alignItems: "center",
      gap: 20,
    },
    closeBtn: {
      alignSelf: "flex-end",
      padding: 4,
    },
    title: {
      fontSize: 26,
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
      marginTop: -8,
    },
    qrContainer: {
      width: 270,
      height: 270,
      borderRadius: 20,
      backgroundColor: "#FFFFFF",
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    qrImage: {
      width: 250,
      height: 250,
      borderRadius: 12,
    },
    waitingCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 16,
      borderRadius: 16,
      width: "100%",
    },
    waitingText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    connectedCard: {
      alignItems: "center",
      gap: 12,
      padding: 28,
      borderRadius: 20,
      width: "100%",
    },
    connectedTitle: {
      fontSize: 22,
      fontFamily: "Inter_700Bold",
    },
    connectedSub: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: 24,
      marginTop: 4,
    },
    primaryBtnText: {
      fontSize: 16,
      fontFamily: "Inter_600SemiBold",
    },
    urlBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      width: "100%",
    },
    urlText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      flex: 1,
    },
    shareBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 24,
      width: "100%",
      justifyContent: "center",
    },
    shareBtnText: {
      fontSize: 17,
      fontFamily: "Inter_600SemiBold",
    },
    hint: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      marginTop: -8,
    },
  });
}
