import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface UserState {
  userId: number | null;
  name: string | null;
  email: string | null;
  token: string | null;
  quizCompleted: boolean;
}

interface UserContextValue extends UserState {
  login: (userId: number, name: string, email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  completeQuiz: () => void;
  isLoggedIn: boolean;
}

const STORAGE_KEY = "styleswipe_user";

const UserContext = createContext<UserContextValue | null>(null);

async function fetchQuizCompleted(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.quizCompleted;
  } catch {
    return false;
  }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserState>({
    userId: null,
    name: null,
    email: null,
    token: null,
    quizCompleted: false,
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as UserState;
          if (parsed.token) {
            setAuthTokenGetter(() => parsed.token);
            // Fetch fresh quiz status from API
            const quizCompleted = await fetchQuizCompleted(parsed.token);
            const updated = { ...parsed, quizCompleted };
            setUser(updated);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }
        } catch {}
      }
      setInitialized(true);
    });
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!user.token) {
      router.replace("/onboarding");
    } else if (!user.quizCompleted) {
      router.replace("/quiz");
    }
    // If token + quizCompleted, stay on current route (expo-router defaults to /(tabs))
  }, [initialized, user.token, user.quizCompleted]);

  const login = useCallback(async (userId: number, name: string, email: string, token: string) => {
    setAuthTokenGetter(() => token);
    const quizCompleted = await fetchQuizCompleted(token);
    const state: UserState = { userId, name, email, token, quizCompleted };
    setUser(state);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (quizCompleted) {
      router.replace("/(tabs)");
    } else {
      router.replace("/quiz");
    }
  }, [router]);

  const logout = useCallback(async () => {
    setUser({ userId: null, name: null, email: null, token: null, quizCompleted: false });
    setAuthTokenGetter(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    router.replace("/onboarding");
  }, [router]);

  const completeQuiz = useCallback(() => {
    setUser((prev) => {
      const updated = { ...prev, quizCompleted: true };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    router.replace("/(tabs)");
  }, [router]);

  return (
    <UserContext.Provider value={{ ...user, login, logout, completeQuiz, isLoggedIn: !!user.token }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
