import { env } from "@/lib/env";
import { getAccessToken, getGuestId } from "./client";

export interface UserInterestedData {
  email?: string;
  is_interested: boolean;
}

export interface UserInterestedResponse {
  id: string;
  email: string | null;
  is_interested: boolean;
  created_at: string;
  updated_at: string;
}

export async function registerInterest(
  data: UserInterestedData,
): Promise<UserInterestedResponse> {
  const baseURL = env.NEXT_PUBLIC_API_URL
    ? `${env.NEXT_PUBLIC_API_URL}/api/v1`
    : "/api/v1";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getAccessToken();
  const guestId = getGuestId();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (guestId) {
    headers["x-guest-id"] = guestId;
  }

  const response = await fetch(`${baseURL}/user-interested`, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to register interest: ${response.status}`);
  }

  return response.json() as Promise<UserInterestedResponse>;
}
