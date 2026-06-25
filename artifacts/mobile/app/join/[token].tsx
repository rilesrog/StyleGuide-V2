import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import { useSession, type ActiveSession } from "@/context/SessionContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

type JoinStatus = "loading" | "success" | "error" | "needsLogin";

export default function JoinSessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token: routeToken } = useLocalSearchParams<{ token: string }>();
  const { token: authToken, isLoggedIn } = useUser();
  const { joinAndSetSession } = useSession();
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!routeToken) {
      setStatus("error");
      setErrorMsg("Invalid invite link.");
      return;
    }

    if (!isLoggedIn || !authToken) {
      setStatus("needsLogin");
      return;
    }

    const join = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/sessions/join/${routeToken}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          setErrorMsg((body as { error?: string }).error ?? "Could not join session.");
          setStatus("error");
          return;
        }
        const data: ActiveSession = await resp.json();
        joinAndSetSession(data);
        setStatus("success");
        setTimeout(() => router.replace("/(tabs)/boards"), 1200);
      } catch {
        setErrorMsg("Network error. Please try again.");
        setStatus("error");
      }
    };

    join();
  }, [routeToken, isLoggedIn, authToken]);

  const s = stylesheet(colors);

  return (
    <View
      style={[s.container, { backgroundColor: colors.background, paddingTop: insets.top + 32 }]}
    >
      {status === "loading" && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[s.label, { color: colors.mutedForeground }]}>Joining session…</Text>
        </>
      )}

      {status === "success" && (
        <>
          <Ionicons name="checkmark-circle" size={72} color="#4CAF50" />
          <Text style={[s.label, { color: colors.foreground }]}>Joined!</Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Taking you to your matches…
          </Text>
        </>
      )}

      {status === "needsLogin" && (
        <>
          <Ionicons name="person-circle-outline" size={72} color={colors.primary} />
          <Text style={[s.label, { color: colors.foreground }]}>Sign in first</Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Create an account or sign in to join this session, then open the invite link again.
          </Text>
        </>
      )}

      {status === "error" && (
        <>
          <Ionicons name="alert-circle-outline" size={72} color={colors.destructive} />
          <Text style={[s.label, { color: colors.foreground }]}>Oops!</Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>{errorMsg}</Text>
        </>
      )}
    </View>
  );
}

function stylesheet(colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingHorizontal: 32,
    },
    label: {
      fontSize: 22,
      fontFamily: "Inter_600SemiBold",
      textAlign: "center",
    },
    sub: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
    },
  });
}
