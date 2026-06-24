import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";

export type AppMode = "decoration" | "registry";

const STORAGE_KEY = "styleswipe_mode";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

interface ModeContextValue {
  mode: AppMode;
  setMode: (mode: AppMode) => Promise<void>;
  isDecoration: boolean;
  isRegistry: boolean;
}

const ModeContext = createContext<ModeContextValue>({
  mode: "decoration",
  setMode: async () => {},
  isDecoration: true,
  isRegistry: false,
});

export function ModeProvider({ children }: { children: React.ReactNode }) {
  const { token, isLoggedIn } = useUser();
  const [mode, setModeState] = useState<AppMode>("decoration");

  // On mount: load from AsyncStorage first, then sync from server
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "decoration" || stored === "registry") {
        setModeState(stored);
      }
    });
  }, []);

  // Sync mode from server when logged in
  useEffect(() => {
    if (!isLoggedIn || !token) return;
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.mode === "decoration" || data?.mode === "registry") {
          setModeState(data.mode);
          AsyncStorage.setItem(STORAGE_KEY, data.mode).catch(() => {});
        }
      })
      .catch(() => {});
  }, [isLoggedIn, token]);

  const setMode = useCallback(
    async (newMode: AppMode) => {
      setModeState(newMode);
      await AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
      if (token) {
        await fetch(`${API_BASE}/api/users/me/mode`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode: newMode }),
        }).catch(() => {});
      }
    },
    [token]
  );

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        isDecoration: mode === "decoration",
        isRegistry: mode === "registry",
      }}
    >
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  return useContext(ModeContext);
}
