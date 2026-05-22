import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { clearAuthStatusCookie } from "@/lib/auth/cookies";
import { broadcastAuthEvent } from "@/lib/auth/sync";
import { env } from "@/lib/env";
import {
  AuthError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenReuseDetectedError,
} from "./errors";

let accessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshSubscribers: Array<(token: string) => void> = [];

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

function onTokenRefreshed(token: string): void {
  for (const callback of refreshSubscribers) {
    callback(token);
  }
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function forceLogout(): void {
  // Keep this axios-layer logout minimal and side-effect safe:
  // clear local auth state, sync across tabs, and navigate to login.
  clearAccessToken();
  clearAuthStatusCookie();
  broadcastAuthEvent("LOGOUT");

  if (typeof window !== "undefined") {
    const loginPath = "/login";
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextUrl =
      currentPath && currentPath !== loginPath
        ? `?next=${encodeURIComponent(currentPath)}`
        : "";

    // Prefer hard navigation to guarantee full reset of app state.
    if (window.location.pathname !== loginPath) {
      window.location.assign(`${loginPath}${nextUrl}`);
    }
  }
}

function handleAuthError(error: AxiosError): never {
  const status = error.response?.status;
  const message =
    (error.response?.data as { message?: string })?.message ?? error.message;

  if (status === 401) {
    if (message.toLowerCase().includes("reuse")) {
      throw new TokenReuseDetectedError(message);
    }
    throw new InvalidCredentialsError(message);
  }
  if (status === 403) {
    throw new TokenExpiredError(message);
  }
  throw new AuthError(message, status);
}

const baseURL = env.NEXT_PUBLIC_API_URL
  ? `${env.NEXT_PUBLIC_API_URL}/api/v1`
  : "/api/v1";

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If refresh itself fails, we must not try to refresh again (would deadlock).
    const originalUrl = originalRequest?.url ?? "";
    if (
      originalUrl.includes("/auth/refresh") &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      forceLogout();
      handleAuthError(error);
    }

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Already retried — fail permanently
    if (originalRequest._retry) {
      handleAuthError(error);
    }

    originalRequest._retry = true;

    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = apiClient
        .post<{ accessToken: string }>("/auth/refresh")
        .then((response) => {
          const newToken = response.data.accessToken;
          accessToken = newToken;
          onTokenRefreshed(newToken);
          return newToken;
        })
        .catch((refreshError: AxiosError) => {
          // Refresh token missing/invalid/etc. -> treat as logged out.
          forceLogout();
          handleAuthError(refreshError);
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    if (!refreshPromise) {
      handleAuthError(error);
    }

    return new Promise((resolve, reject) => {
      addRefreshSubscriber((token: string) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${token}`;
        }
        resolve(apiClient(originalRequest));
      });

      refreshPromise?.catch((err) => {
        reject(err);
      });
    });
  },
);

export function clearAccessToken(): void {
  accessToken = null;
  isRefreshing = false;
  refreshPromise = null;
  refreshSubscribers = [];
}
