import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useUser } from "./UserContext";
import { useSession } from "./SessionContext";

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
  const { session, isActive } = useSession();
  const [mode, setModeState] = useState<AppMode>("decoration");

  // On mount: load from AsyncStorage first
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "decoration" || stored === "registry") {
        setModeState(stored);
      }
    });
  }, []);

  // Sync mode from server user profile when logged in (and no active session)
  useEffect(() => {
    if (!isLoggedIn || !token || isActive) return;
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
  }, [isLoggedIn, token, isActive]);

  // When a session is active, session.mode is authoritative — sync both partners
  useEffect(() => {
    if (!isActive || !session) return;
    const sessionMode = session.mode;
    if (sessionMode === "decoration" || sessionMode === "registry") {
      if (sessionMode !== mode) {
        setModeState(sessionMode);
        AsyncStorage.setItem(STORAGE_KEY, sessionMode).catch(() => {});
      }
    }
  }, [isActive, session?.mode]);

  const setMode = useCallback(
    async (newMode: AppMode) => {
      setModeState(newMode);
      await AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
      if (token) {
        // Always update user profile mode
        fetch(`${API_BASE}/api/users/me/mode`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ mode: newMode }),
        }).catch(() => {});
        // Also update session mode so partner picks it up via session polling
        if (isActive && session?.id) {
          fetch(`${API_BASE}/api/sessions/${session.id}/mode`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ mode: newMode }),
          }).catch(() => {});
        }
      }
    },
    [token, isActive, session?.id]
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
