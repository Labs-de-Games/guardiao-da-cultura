import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import posthog from "posthog-js";
import { clearAuthStatusCookie } from "@/lib/auth/cookies";
import { broadcastAuthEvent } from "@/lib/auth/sync";
import {
  handleBackendUnavailable,
  isBackendUnavailableError,
} from "./backendAvailability";
import { API_BASE_URL } from "./baseUrl";
import {
  AuthError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenReuseDetectedError,
} from "./errors";

let accessToken: string | null = null;
let guestId: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
let refreshSubscribers: Array<(token: string) => void> = [];

const FORCE_LOGOUT_TOAST_MESSAGE =
  "Sua sess\u00e3o expirou. Fa\u00e7a login novamente.";
const TOAST_STORAGE_KEY = "app.toast.next";

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setGuestId(id: string | null): void {
  guestId = id;
}

export function getGuestId(): string | null {
  return guestId;
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
  clearAccessToken();
  clearAuthStatusCookie();
  broadcastAuthEvent("LOGOUT");

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        TOAST_STORAGE_KEY,
        JSON.stringify({
          message: FORCE_LOGOUT_TOAST_MESSAGE,
          severity: "info",
        }),
      );
    } catch {
      // Ignore storage failures.
    }

    const loginPath = "/login";
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const nextUrl =
      currentPath && currentPath !== loginPath
        ? `?next=${encodeURIComponent(currentPath)}`
        : "";

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

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  } else if (guestId && config.headers) {
    config.headers["x-guest-id"] = guestId;
  }

  if (posthog.__loaded) {
    const sessionId = posthog.get_session_id();
    const distinctId = posthog.get_distinct_id();

    if (sessionId) {
      config.headers["X-PostHog-Session-ID"] = sessionId;
    }
    if (distinctId) {
      config.headers["X-PostHog-Distinct-ID"] = distinctId;
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const originalUrl = originalRequest?.url ?? "";
    if (
      originalUrl.includes("/auth/refresh") &&
      (error.response?.status === 401 || error.response?.status === 403)
    ) {
      forceLogout();
      handleAuthError(error);
    }

    if (isBackendUnavailableError(error)) {
      void handleBackendUnavailable();
      return Promise.reject(error);
    }

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (!accessToken) {
      return Promise.reject(error);
    }

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
  guestId = null;
  isRefreshing = false;
  refreshPromise = null;
  refreshSubscribers = [];
}
