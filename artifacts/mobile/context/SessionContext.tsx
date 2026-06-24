import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";
import { useUser } from "./UserContext";

export interface SessionMember {
  id: number;
  name: string;
  email: string;
}

export interface ActiveSession {
  id: number;
  status: string;
  mode: string | null;
  inviteToken: string;
  creator: SessionMember;
  partner: SessionMember | null;
}

interface SessionContextValue {
  session: ActiveSession | null;
  inviteUrl: string | null;
  isCreator: boolean;
  isActive: boolean;
  startSession: () => Promise<ActiveSession>;
  refreshSession: () => Promise<void>;
  joinAndSetSession: (sessionData: ActiveSession) => void;
  leaveSession: () => void;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  inviteUrl: null,
  isCreator: false,
  isActive: false,
  startSession: async () => {
    throw new Error("SessionProvider not mounted");
  },
  refreshSession: async () => {},
  joinAndSetSession: () => {},
  leaveSession: () => {},
});

function buildInviteUrl(token: string): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}/join/${token}`;
  }
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  return domain ? `https://${domain}/join/${token}` : `/join/${token}`;
}

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { token: authToken, userId } = useUser();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tokenRef = useRef<string | null>(null);
  const sessionIdRef = useRef<number | null>(null);

  useEffect(() => {
    tokenRef.current = authToken;
  }, [authToken]);

  useEffect(() => {
    sessionIdRef.current = session?.id ?? null;
  }, [session?.id]);

  const authHeaders = useCallback(
    (): Record<string, string> => ({
      "Content-Type": "application/json",
      ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
    }),
    []
  );

  // Stable refreshSession — reads session ID from a ref so polling interval
  // never restarts just because session state changed (which would reset the timer).
  const refreshSession = useCallback(async () => {
    const id = sessionIdRef.current;
    if (!id) return;
    try {
      const resp = await fetch(`${API_BASE}/api/sessions/${id}`, {
        headers: authHeaders(),
      });
      if (resp.ok) {
        const data: ActiveSession = await resp.json();
        setSession(data);
      }
    } catch {}
  }, [authHeaders]);

  // Poll every 5 seconds while a session exists (pending or active).
  // Depends only on session?.id so the interval is stable across polls.
  // Partners pick up mode changes from each other via session.mode in the response.
  useEffect(() => {
    if (!session) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    pollingRef.current = setInterval(refreshSession, 5000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [session?.id, refreshSession]);

  const startSession = useCallback(async (): Promise<ActiveSession> => {
    const resp = await fetch(`${API_BASE}/api/sessions`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!resp.ok) throw new Error("Failed to create session");
    const data: ActiveSession = await resp.json();
    setSession(data);
    return data;
  }, [authHeaders]);

  const joinAndSetSession = useCallback((sessionData: ActiveSession) => {
    setSession(sessionData);
  }, []);

  const leaveSession = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setSession(null);
  }, []);

  const inviteUrl = session ? buildInviteUrl(session.inviteToken) : null;
  const isCreator = session ? session.creator.id === userId : false;
  const isActive = session?.status === "active";

  return (
    <SessionContext.Provider
      value={{
        session,
        inviteUrl,
        isCreator,
        isActive,
        startSession,
        refreshSession,
        joinAndSetSession,
        leaveSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
