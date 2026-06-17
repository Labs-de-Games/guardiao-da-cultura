import { apiClient } from "./client";

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
  const response = await apiClient.post<UserInterestedResponse>(
    "/user-interested",
    data,
  );
  return response.data;
}
