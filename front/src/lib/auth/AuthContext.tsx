"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  confirmLogin as apiConfirmLogin,
  confirmVerifyEmail as apiConfirmVerifyEmail,
  login as apiLogin,
  logout as apiLogout,
  logoutAll as apiLogoutAll,
  me as apiMe,
  refreshToken as apiRefreshToken,
  register as apiRegister,
} from "@/lib/api/auth";
import { clearAccessToken, setAccessToken } from "@/lib/api/client";
import {
  clearAuthStatusCookie,
  hasAuthStatusCookie,
  setAuthStatusCookie,
} from "@/lib/auth/cookies";
import { subscribeToAuthSync } from "@/lib/auth/sync";
import type {
  AuthState,
  LoginConfirmData,
  LoginCredentials,
  RegisterCredentials,
  User,
  VerifyEmailConfirmData,
} from "@/lib/auth/types";

export interface AuthContextValue extends AuthState {
  login: (data: LoginCredentials) => Promise<void>;
  confirmLogin: (data: LoginConfirmData) => Promise<void>;
  register: (data: RegisterCredentials) => Promise<void>;
  confirmVerifyEmail: (data: VerifyEmailConfirmData) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    setAccessTokenState(null);
    clearAccessToken();
    clearAuthStatusCookie();
    posthog.reset();
  }, []);

  const restoreSession = useCallback(async () => {
    if (!hasAuthStatusCookie()) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await apiMe();
      setUser(userData);
      setIsAuthenticated(true);
      posthog.identify(userData.id);
    } catch {
      // /me failed, try refresh
      try {
        const token = await apiRefreshToken();
        setAccessToken(token);
        setAccessTokenState(token);
        const userData = await apiMe();
        setUser(userData);
        setIsAuthenticated(true);
        setAuthStatusCookie();
        posthog.identify(userData.id);
      } catch {
        clearAuthState();
      }
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSync(
      (type: "LOGIN" | "LOGOUT" | "LOGOUT_ALL") => {
        if (type === "LOGOUT" || type === "LOGOUT_ALL") {
          clearAuthState();
          router.push("/login");
        }
      },
    );
    return unsubscribe;
  }, [clearAuthState, router]);

  const login = useCallback(async (data: LoginCredentials) => {
    await apiLogin(data);
  }, []);

  const confirmLogin = useCallback(
    async (data: LoginConfirmData) => {
      const result = await apiConfirmLogin(data);
      const token = await apiRefreshToken();
      setAccessToken(token);
      setAccessTokenState(token);
      const userData = await apiMe();
      setUser(userData);
      setIsAuthenticated(true);
      setAuthStatusCookie();
      posthog.identify(userData.id);
      router.push(result.redirectTo);
    },
    [router],
  );

  const register = useCallback(async (data: RegisterCredentials) => {
    await apiRegister(data);
  }, []);

  const confirmVerifyEmail = useCallback(
    async (data: VerifyEmailConfirmData) => {
      const result = await apiConfirmVerifyEmail(data);
      const token = await apiRefreshToken();
      setAccessToken(token);
      setAccessTokenState(token);
      const userData = await apiMe();
      setUser(userData);
      setIsAuthenticated(true);
      setAuthStatusCookie();
      posthog.identify(userData.id);
      router.push(result.redirectTo);
    },
    [router],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    clearAuthState();
    router.push("/login");
  }, [clearAuthState, router]);

  const logoutAll = useCallback(async () => {
    await apiLogoutAll();
    clearAuthState();
    router.push("/login");
  }, [clearAuthState, router]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoading,
    accessToken,
    login,
    confirmLogin,
    register,
    confirmVerifyEmail,
    logout,
    logoutAll,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
