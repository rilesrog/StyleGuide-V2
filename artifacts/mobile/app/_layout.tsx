import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";
import { useFonts } from "expo-font";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UserProvider, useUser } from "@/context/UserContext";
import { SessionProvider } from "@/context/SessionContext";
import { ModeProvider } from "@/context/ModeContext";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

// Set API base URL at module level (before any component mounts)
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function parseMagicToken(raw: string): string | null {
  const query = raw.includes("?") ? raw.split("?")[1].split("#")[0] : "";
  return new URLSearchParams(query).get("magic_token");
}

// Handles magic link deep links — must be inside UserProvider
function AuthCallbackHandler() {
  const url = Linking.useURL();
  const { login, isLoggedIn } = useUser();
  const handledRef = useRef<Set<string>>(new Set());

  const attemptVerify = useCallback(
    (rawUrl: string) => {
      if (isLoggedIn) return;
      const magicToken = parseMagicToken(rawUrl);
      if (!magicToken) return;
      if (handledRef.current.has(magicToken)) return;
      handledRef.current.add(magicToken);

      fetch(`${API_BASE}/api/auth/magic-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: magicToken }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.token) {
            login(data.userId, data.name, data.email, data.token);
            if (typeof window !== "undefined") {
              window.history.replaceState(null, "", window.location.pathname);
            }
          }
        })
        .catch(console.error);
    },
    [isLoggedIn, login]
  );

  useEffect(() => {
    if (url) attemptVerify(url);
  }, [url, attemptVerify]);

  // Web fallback: read query params on mount in case useURL hasn't fired yet
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.search) attemptVerify(window.location.href);
  }, [attemptVerify]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="quiz/index" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="quiz/results" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="invite" options={{ title: "Invite Partner", presentation: "modal" }} />
      <Stack.Screen name="join/[token]" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <UserProvider>
                <AuthCallbackHandler />
                <SessionProvider>
                  <ModeProvider>
                    <RootLayoutNav />
                  </ModeProvider>
                </SessionProvider>
              </UserProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
