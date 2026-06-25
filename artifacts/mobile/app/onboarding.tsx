import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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

type Mode = "welcome" | "email" | "code";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export default function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useUser();

  const [mode, setMode] = useState<Mode>("welcome");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const codeRef = useRef<TextInput>(null);

  const handleSendCode = async () => {
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/magic-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send code. Please try again.");
        return;
      }
      setCode("");
      setMode("code");
      setTimeout(() => codeRef.current?.focus(), 300);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError("");
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError("Please enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/magic-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed, email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid or expired code. Try requesting a new one.");
        return;
      }
      login(data.userId, data.name, data.email, data.token);
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  const Logo = () => (
    <View style={s.logoRow}>
      <View style={s.frameIcon}>
        <View style={s.frameTopLeft} />
        <View style={s.frameBottomRight} />
        <View style={s.framePlus}>
          <Text style={s.framePlusText}>+</Text>
        </View>
      </View>
      <Text style={s.appName}>StyleSwipe</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            s.scroll,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
              paddingBottom: insets.bottom + 40,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {mode === "welcome" && (
            <>
              <View style={s.heroSection}>
                <Logo />
                <Text style={s.tagline}>Discover what you love.</Text>
              </View>
              <View style={s.spacer} />
              <View style={s.actions}>
                <Pressable style={s.createBtn} onPress={() => setMode("email")}>
                  <Text style={s.createBtnText}>Create Account</Text>
                </Pressable>
                <Pressable style={s.signInBtn} onPress={() => setMode("email")}>
                  <Text style={s.signInBtnText}>Sign In</Text>
                </Pressable>
              </View>
            </>
          )}

          {mode === "email" && (
            <>
              <View style={s.heroSection}>
                <Logo />
                <Text style={s.tagline}>Discover what you love.</Text>
              </View>
              <View style={s.form}>
                <Text style={s.formTitle}>Enter your email</Text>
                <Text style={s.formSubtitle}>
                  We'll email you a 6-digit sign-in code — no password needed.
                </Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.card,
                      borderColor: error ? colors.destructive : "#D0D0D0",
                      color: colors.foreground,
                    },
                  ]}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(""); }}
                  placeholder="you@example.com"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                />
                {error ? (
                  <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
                ) : null}
                <Pressable
                  style={[s.createBtn, { opacity: loading ? 0.6 : 1 }]}
                  onPress={handleSendCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#111111" />
                  ) : (
                    <Text style={s.createBtnText}>Send Code</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => { setMode("welcome"); setError(""); }}>
                  <Text style={s.backText}>← Back</Text>
                </Pressable>
              </View>
            </>
          )}

          {mode === "code" && (
            <>
              <View style={s.heroSection}>
                <Logo />
              </View>
              <View style={s.form}>
                <Text style={s.sentIcon}>📬</Text>
                <Text style={s.formTitle}>Check your email</Text>
                <Text style={s.formSubtitle}>
                  We sent a 6-digit code to{"\n"}
                  <Text style={{ fontFamily: "Inter_600SemiBold" }}>{email}</Text>
                </Text>
                <TextInput
                  ref={codeRef}
                  style={[
                    s.codeInput,
                    {
                      backgroundColor: colors.card,
                      borderColor: error ? colors.destructive : "#D0D0D0",
                      color: colors.foreground,
                    },
                  ]}
                  value={code}
                  onChangeText={(t) => {
                    const digits = t.replace(/\D/g, "").slice(0, 6);
                    setCode(digits);
                    setError("");
                  }}
                  placeholder="000000"
                  placeholderTextColor="#9E9E9E"
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />
                {error ? (
                  <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
                ) : null}
                <Pressable
                  style={[s.createBtn, { opacity: loading ? 0.6 : 1 }]}
                  onPress={handleVerifyCode}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#111111" />
                  ) : (
                    <Text style={s.createBtnText}>Verify Code</Text>
                  )}
                </Pressable>
                <Pressable onPress={() => { setMode("email"); setError(""); setCode(""); }}>
                  <Text style={s.backText}>Resend code</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function styles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFFFFF" },
    scroll: { flexGrow: 1, paddingHorizontal: 28 },

    heroSection: {
      alignItems: "center",
      paddingTop: 80,
      paddingBottom: 20,
      gap: 16,
    },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    frameIcon: { width: 52, height: 52, position: "relative" },
    frameTopLeft: {
      position: "absolute", top: 0, left: 0, width: 26, height: 26,
      borderTopWidth: 3.5, borderLeftWidth: 3.5, borderColor: "#111111",
    },
    frameBottomRight: {
      position: "absolute", bottom: 0, right: 0, width: 26, height: 26,
      borderBottomWidth: 3.5, borderRightWidth: 3.5, borderColor: "#111111",
    },
    framePlus: {
      position: "absolute", top: 12, left: 12, right: 12, bottom: 12,
      alignItems: "center", justifyContent: "center",
    },
    framePlusText: {
      fontSize: 20, color: "#111111", fontFamily: "Inter_400Regular",
      lineHeight: 20, textAlign: "center", includeFontPadding: false,
    },
    appName: {
      fontSize: 38, fontFamily: "Inter_700Bold", color: "#111111", letterSpacing: -1,
    },
    tagline: {
      fontSize: 15, fontFamily: "Inter_400Regular", color: "#555555",
      textAlign: "center", letterSpacing: 0.1,
    },

    spacer: { flex: 1, minHeight: 120 },

    actions: { gap: 12 },
    createBtn: {
      height: 56, borderRadius: 14, backgroundColor: "#E0E0E0",
      alignItems: "center", justifyContent: "center",
    },
    createBtnText: { fontSize: 17, fontFamily: "Inter_500Medium", color: "#111111" },
    signInBtn: {
      height: 56, borderRadius: 14, backgroundColor: "#FFFFFF",
      borderWidth: 1.5, borderColor: "#111111",
      alignItems: "center", justifyContent: "center",
    },
    signInBtnText: { fontSize: 17, fontFamily: "Inter_500Medium", color: "#111111" },

    form: { gap: 16, alignItems: "stretch" },
    sentIcon: { fontSize: 48, textAlign: "center" },
    formTitle: {
      fontSize: 22, fontFamily: "Inter_700Bold", color: "#111111", textAlign: "center",
    },
    formSubtitle: {
      fontSize: 14, fontFamily: "Inter_400Regular", color: "#666666",
      textAlign: "center", lineHeight: 22,
    },
    input: {
      height: 54, borderRadius: 14, borderWidth: 1.5,
      paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_400Regular",
    },
    codeInput: {
      height: 72, borderRadius: 14, borderWidth: 1.5,
      paddingHorizontal: 16, fontSize: 36, fontFamily: "Inter_700Bold",
      textAlign: "center", letterSpacing: 10,
    },
    errorText: {
      fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center",
    },
    backText: {
      fontSize: 14, fontFamily: "Inter_400Regular",
      color: "#888888", textAlign: "center", marginTop: 4,
    },
  });
}
