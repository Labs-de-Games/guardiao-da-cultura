import { clearAuthStatusCookie, setAuthStatusCookie } from "@/lib/auth/cookies";
import { broadcastAuthEvent } from "@/lib/auth/sync";
import type {
  AuthResponse,
  LoginConfirmData,
  LoginCredentials,
  RegisterCredentials,
  ResendVerificationData,
  User,
  VerifyEmailConfirmData,
} from "@/lib/auth/types";
import { apiClient, clearAccessToken } from "./client";

export async function login(
  data: LoginCredentials,
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    "/auth/login",
    data,
  );
  return response.data;
}

export async function confirmLogin(
  data: LoginConfirmData,
): Promise<{ redirectTo: string }> {
  const response = await apiClient.post<{ redirectTo: string }>(
    "/auth/login/confirm",
    data,
  );
  setAuthStatusCookie();
  return response.data;
}

export async function register(
  data: RegisterCredentials,
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    "/auth/register",
    data,
  );
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout");
  } finally {
    clearAccessToken();
    clearAuthStatusCookie();
    broadcastAuthEvent("LOGOUT");
  }
}

export async function logoutAll(): Promise<void> {
  try {
    await apiClient.post("/auth/logout-all");
  } finally {
    clearAccessToken();
    clearAuthStatusCookie();
    broadcastAuthEvent("LOGOUT_ALL");
  }
}

export async function refreshToken(): Promise<string> {
  const response = await apiClient.post<{ accessToken: string }>(
    "/auth/refresh",
  );
  return response.data.accessToken;
}

export async function resendVerification(
  data: ResendVerificationData,
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    "/auth/resend-verification",
    data,
  );
  return response.data;
}

export async function me(): Promise<User> {
  const response = await apiClient.get<User>("/auth/me");
  return response.data;
}

export async function confirmVerifyEmail(
  data: VerifyEmailConfirmData,
): Promise<{ redirectTo: string }> {
  const response = await apiClient.post<{ redirectTo: string }>(
    "/auth/verify-email/confirm",
    data,
  );
  setAuthStatusCookie();
  return response.data;
}
