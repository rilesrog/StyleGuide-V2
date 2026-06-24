import { useRegisterUser, useLoginUser } from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@/context/UserContext";
import * as Haptics from "expo-haptics";

type Mode = "welcome" | "register" | "login";

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useUser();
  const [mode, setMode] = useState<Mode>("welcome");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const registerMutation = useRegisterUser();
  const loginMutation = useLoginUser();

  const isLoading = registerMutation.isPending || loginMutation.isPending;

  const handleGetStarted = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await registerMutation.mutateAsync({
        data: { name: name.trim(), email: email.trim(), password },
      });
      await login(data.userId, data.name, data.email, data.token);
    } catch (err: unknown) {
      const apiErr = err as { status?: number };
      if (apiErr?.status === 409) {
        setError("Email already registered. Sign in instead.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  const handleSignIn = async () => {
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password");
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const data = await loginMutation.mutateAsync({
        data: { email: email.trim(), password },
      });
      await login(data.userId, data.name, data.email, data.token);
    } catch {
      setError("Invalid email or password.");
    }
  };

  const s = styles(colors);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.heroSection}>
            <View style={[s.logoMark, { backgroundColor: colors.primary }]}>
              <Text style={s.logoMarkText}>S</Text>
            </View>
            <Text style={[s.appName, { color: colors.foreground }]}>StyleSwipe</Text>
            <Text style={[s.tagline, { color: colors.mutedForeground }]}>
              Discover your aesthetic.{"\n"}Find pieces you love.
            </Text>
          </View>

          {mode === "welcome" && (
            <View style={s.welcomeActions}>
              <Pressable
                style={[s.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => setMode("register")}
              >
                <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>
                  Create Account
                </Text>
              </Pressable>
              <Pressable
                style={[s.secondaryBtn, { borderColor: colors.border }]}
                onPress={() => setMode("login")}
              >
                <Text style={[s.secondaryBtnText, { color: colors.foreground }]}>Sign In</Text>
              </Pressable>
            </View>
          )}

          {(mode === "register" || mode === "login") && (
            <View style={s.form}>
              {mode === "register" && (
                <View style={s.inputGroup}>
                  <Text style={[s.label, { color: colors.mutedForeground }]}>Your Name</Text>
                  <TextInput
                    style={[
                      s.input,
                      { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                    ]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g. Alex Rivera"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              )}

              <View style={s.inputGroup}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>Email</Text>
                <TextInput
                  style={[
                    s.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.label, { color: colors.mutedForeground }]}>Password</Text>
                <TextInput
                  style={[
                    s.input,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={mode === "register" ? handleGetStarted : handleSignIn}
                />
              </View>

              {error ? (
                <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
              ) : null}

              <Pressable
                style={[
                  s.primaryBtn,
                  { backgroundColor: colors.primary, opacity: isLoading ? 0.6 : 1 },
                ]}
                onPress={mode === "register" ? handleGetStarted : handleSignIn}
                disabled={isLoading}
              >
                <Text style={[s.primaryBtnText, { color: colors.primaryForeground }]}>
                  {isLoading ? "Loading..." : mode === "register" ? "Get Started" : "Sign In"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setError("");
                  setPassword("");
                }}
              >
                <Text style={[s.switchText, { color: colors.mutedForeground }]}>
                  {mode === "register"
                    ? "Already have an account? Sign in"
                    : "New here? Create an account"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMode("welcome");
                  setError("");
                  setPassword("");
                }}
              >
                <Text style={[s.backText, { color: colors.mutedForeground }]}>Back</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll: { flexGrow: 1, paddingHorizontal: 28 },
    heroSection: { alignItems: "center", paddingTop: 48, paddingBottom: 48, gap: 12 },
    logoMark: {
      width: 72,
      height: 72,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    logoMarkText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
    appName: { fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    tagline: {
      fontSize: 17,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 26,
    },
    welcomeActions: { gap: 12 },
    form: { gap: 16 },
    inputGroup: { gap: 6 },
    label: { fontSize: 13, fontFamily: "Inter_500Medium", letterSpacing: 0.3 },
    input: {
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 16,
      fontSize: 16,
      fontFamily: "Inter_400Regular",
    },
    primaryBtn: { height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    primaryBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
    secondaryBtn: {
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryBtnText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
    errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
    switchText: {
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: 4,
    },
    backText: {
      fontSize: 14,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      marginTop: -4,
    },
  });
}
