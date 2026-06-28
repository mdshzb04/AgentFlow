"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/api";
import { resetApolloClient } from "@/lib/apollo/client";
import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/auth";
import type { User } from "@/types/user";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async (accessToken: string) => {
    const profile = await apiRequest<User>("/api/v1/auth/me", {
      token: accessToken,
    });
    setUser(profile);
    setToken(accessToken);
  }, []);

  const refreshUser = useCallback(async () => {
    const stored = getStoredToken();
    if (!stored) {
      setUser(null);
      setToken(null);
      return;
    }
    await fetchUser(stored);
  }, [fetchUser]);

  useEffect(() => {
    const init = async () => {
      const stored = getStoredToken();
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        await fetchUser(stored);
      } catch {
        clearStoredToken();
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };
    void init();
  }, [fetchUser]);

  const login = useCallback(
    async (accessToken: string) => {
      setStoredToken(accessToken);
      await fetchUser(accessToken);
    },
    [fetchUser],
  );

  const logout = useCallback(() => {
    clearStoredToken();
    resetApolloClient();
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
