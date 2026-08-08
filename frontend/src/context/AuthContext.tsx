'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { AuthUser, LoginPayload, SignupPayload } from '@/types/auth';
import { authApi, ApiError } from '@/lib/api';

// ─────────────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  signup: (payload: SignupPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Access token lives in memory only — never persisted to localStorage.
// The refresh token is stored in an HttpOnly cookie managed by the server.

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Schedule a proactive token refresh ~1 min before expiry (14 min for 15 min token). */
  const scheduleRefresh = useCallback((delayMs = 14 * 60 * 1000) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const data = await authApi.refresh();
        setAccessToken(data.accessToken);
        scheduleRefresh(); // schedule next refresh
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    }, delayMs);
  }, []);

  /** Try to restore session from the HttpOnly refresh token cookie on mount. */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const { accessToken: newToken } = await authApi.refresh();
        setAccessToken(newToken);
        const { user: me } = await authApi.me(newToken);
        setUser(me);
        scheduleRefresh();
      } catch {
        // No valid session — user needs to log in
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { user: me, accessToken: token } = await authApi.login(payload);
      setUser(me);
      setAccessToken(token);
      scheduleRefresh();
    },
    [scheduleRefresh],
  );

  const signup = useCallback(
    async (payload: SignupPayload) => {
      const { user: me, accessToken: token } = await authApi.signup(payload);
      setUser(me);
      setAccessToken(token);
      scheduleRefresh();
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    try {
      await authApi.logout(accessToken ?? undefined);
    } catch {
      // Best-effort — clear client state regardless
    }
    setUser(null);
    setAccessToken(null);
  }, [accessToken]);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const { accessToken: newToken } = await authApi.refresh();
      setAccessToken(newToken);
      return newToken;
    } catch {
      setUser(null);
      setAccessToken(null);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>');
  return ctx;
}
