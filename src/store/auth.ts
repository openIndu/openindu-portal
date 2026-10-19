import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi, clearAuthStorage, type AuthResponse, type User, type UserRole } from "@/api";

const STORAGE_KEYS = {
  token: "openindu_portal_token",
  refreshToken: "openindu_portal_refresh_token",
  user: "openindu_portal_user",
} as const;

interface AuthContextValue {
  token: string | null;
  refreshTokenValue: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isLoading: boolean;
  login: (payload: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  updateProfile: (payload: { nickname?: string | null }) => Promise<User>;
  setUser: (user: User | null) => void;
  hasRole: (role?: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readUser() {
  const raw = localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(STORAGE_KEYS.user);
    return null;
  }
}

function persistAuth(token: string | null, refreshToken: string | null, user: User | null) {
  if (token) localStorage.setItem(STORAGE_KEYS.token, token);
  else localStorage.removeItem(STORAGE_KEYS.token);

  if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken);
  else localStorage.removeItem(STORAGE_KEYS.refreshToken);

  if (user) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEYS.user);
}

const roleRank: Record<UserRole, number> = {
  user: 1,
  member: 2,
  admin: 3,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEYS.token));
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.refreshToken),
  );
  const [user, setUserState] = useState<User | null>(() => readUser());
  const [isLoading, setIsLoading] = useState(true);

  const didInit = useRef(false);
  useEffect(() => {
    // Guard against React StrictMode's double-invoke in dev: without this the
    // bootstrap fired twice, and because the backend rotates refresh tokens
    // (old jti blacklisted on every /auth/refresh) the second call used an
    // already-rotated token, 401'd, and logged the user out on load.
    if (didInit.current) return;
    didInit.current = true;

    const storedToken = localStorage.getItem(STORAGE_KEYS.token);
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    if (!storedToken && !storedRefreshToken) {
      setIsLoading(false);
      return;
    }

    // Validate the session via /auth/me. If the access token has expired the
    // response interceptor refreshes once -- single-flighted within the tab and
    // serialized across tabs via Web Locks -- and retries, so we never fire a
    // second concurrent refresh from here.
    authApi
      .me()
      .then((nextUser) => {
        setUserState(nextUser);
        // Tokens may have been rotated by the interceptor mid-flight; re-sync.
        setToken(localStorage.getItem(STORAGE_KEYS.token));
        setRefreshTokenValue(localStorage.getItem(STORAGE_KEYS.refreshToken));
        if (nextUser) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
      })
      .catch(() => {
        // Session invalid (refresh also failed) - clear ALL auth state.
        clearAuthStorage();
        setToken(null);
        setRefreshTokenValue(null);
        setUserState(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Cross-tab auth sync: a storage event fires only in *other* tabs. When one
  // tab logs out (token removed) or refreshes (token rotated), mirror that into
  // this tab's in-memory state. Portal has public pages, so we don't force a
  // redirect here -- route guards handle protected pages.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.token) return;
      if (e.newValue === null) {
        setToken(null);
        setRefreshTokenValue(null);
        setUserState(null);
      } else {
        setToken(e.newValue);
        setRefreshTokenValue(localStorage.getItem(STORAGE_KEYS.refreshToken));
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setUser = useCallback((nextUser: User | null) => {
    setUserState(nextUser);
    if (nextUser) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    else localStorage.removeItem(STORAGE_KEYS.user);
  }, []);

  const login = useCallback(
    async (payload: AuthResponse) => {
      const nextToken = payload.access_token;
      const nextRefreshToken = payload.refresh_token;
      let nextUser = payload.user ?? null;

      persistAuth(nextToken, nextRefreshToken, nextUser);
      setToken(nextToken);
      setRefreshTokenValue(nextRefreshToken);

      if (!nextUser) {
        try {
          nextUser = await authApi.me();
        } catch {
          nextUser = null;
        }
      }
      setUser(nextUser);
    },
    [setUser],
  );

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(STORAGE_KEYS.token)) {
        await authApi.logout();
      }
    } catch {
      // Client-side logout should still clear local state if the server is unavailable.
    } finally {
      persistAuth(null, null, null);
      setToken(null);
      setRefreshTokenValue(null);
      setUserState(null);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    if (!refreshTokenValue) return null;
    const refreshed = await authApi.refresh(refreshTokenValue);
    const nextToken = refreshed.access_token;
    const nextRefreshToken = refreshed.refresh_token ?? refreshTokenValue;
    const nextUser = refreshed.user ?? user;
    persistAuth(nextToken, nextRefreshToken, nextUser);
    setToken(nextToken);
    setRefreshTokenValue(nextRefreshToken);
    setUserState(nextUser);
    return nextToken;
  }, [refreshTokenValue, user]);

  const updateProfile = useCallback(
    async (payload: { nickname?: string | null }) => {
      const updatedUser = await authApi.updateMe(payload);
      setUser(updatedUser);
      return updatedUser;
    },
    [setUser],
  );

  const hasRole = useCallback(
    (role?: UserRole) => {
      if (!role) return Boolean(token);
      if (!user) return false;
      return roleRank[user.role] >= roleRank[role];
    },
    [token, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      refreshTokenValue,
      user,
      isAuthenticated: Boolean(token),
      isAdmin: user?.role === "admin",
      isMember: user?.role === "member" || user?.role === "admin",
      isLoading,
      login,
      logout,
      refreshToken,
      updateProfile,
      setUser,
      hasRole,
    }),
    [
      token,
      refreshTokenValue,
      user,
      isLoading,
      login,
      logout,
      refreshToken,
      updateProfile,
      setUser,
      hasRole,
    ],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
