import AsyncStorage from "@react-native-async-storage/async-storage";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

interface UserState {
  userId: number | null;
  name: string | null;
  email: string | null;
  token: string | null;
}

interface UserContextValue extends UserState {
  login: (userId: number, name: string, email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
}

const STORAGE_KEY = "styleswipe_user";

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserState>({
    userId: null,
    name: null,
    email: null,
    token: null,
  });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as UserState;
          setUser(parsed);
          if (parsed.token) {
            setAuthTokenGetter(() => parsed.token);
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
    }
  }, [initialized, user.token]);

  const login = useCallback(async (userId: number, name: string, email: string, token: string) => {
    const state: UserState = { userId, name, email, token };
    setUser(state);
    setAuthTokenGetter(() => token);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    router.replace("/(tabs)");
  }, [router]);

  const logout = useCallback(async () => {
    setUser({ userId: null, name: null, email: null, token: null });
    setAuthTokenGetter(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
    router.replace("/onboarding");
  }, [router]);

  return (
    <UserContext.Provider value={{ ...user, login, logout, isLoggedIn: !!user.token }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
