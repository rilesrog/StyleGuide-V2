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

const SUPABASE_AUTH_TYPES = new Set(["magiclink", "signup", "recovery", "email"]);

function parseSupabaseToken(raw: string): { accessToken: string | null; type: string | null } {
  // Check hash fragment (#access_token=...)
  const hash = raw.includes("#") ? raw.split("#")[1] : "";
  const hashParams = new URLSearchParams(hash);
  if (hashParams.get("access_token")) {
    return { accessToken: hashParams.get("access_token"), type: hashParams.get("type") };
  }
  // Check query string (?access_token=...) — set by our API callback bridge page
  const query = raw.includes("?") ? raw.split("?")[1].split("#")[0] : raw;
  const queryParams = new URLSearchParams(query);
  return { accessToken: queryParams.get("access_token"), type: queryParams.get("type") };
}

// Handles Supabase magic link deep links — must be inside UserProvider
function AuthCallbackHandler() {
  const url = Linking.useURL();
  const { login, isLoggedIn } = useUser();
  const handledRef = useRef<Set<string>>(new Set());

  const attemptVerify = useCallback(
    (rawUrl: string) => {
      if (isLoggedIn) return;
      const { accessToken, type } = parseSupabaseToken(rawUrl);
      if (!accessToken) return;
      if (type && !SUPABASE_AUTH_TYPES.has(type)) return;
      if (handledRef.current.has(accessToken)) return;
      handledRef.current.add(accessToken);

      fetch(`${API_BASE}/api/auth/supabase-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken }),
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

  // Handle URL from expo-linking (works for native deep links and web navigation)
  useEffect(() => {
    if (url) attemptVerify(url);
  }, [url, attemptVerify]);

  // Web fallback: read hash/query directly on mount in case useURL misses it
  useEffect(() => {
    if (typeof window === "undefined") return;
    const full = window.location.href;
    if (window.location.search || window.location.hash) attemptVerify(full);
  }, [attemptVerify]);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
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
