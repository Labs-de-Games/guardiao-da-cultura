import { apiClient } from "./api/client";

export interface SubmitScoreRequest {
  userId: string;
  levelId: string;
  totalQuarters: number;
  totalStars: number;
  rating: string;
  floors: Array<{
    floorIndex: number;
    errors: number;
    quartersEarned: number;
  }>;
  quiz: {
    totalQuestions: number;
    correctAnswers: number;
    accuracyPercent: number;
    quartersEarned: number;
  };
  collectibles: {
    total: number;
    interactionsCount: number;
    quartersEarned: number;
  };
  collectedCollectibles: Array<{
    collectibleId: string;
    collectibleType: "CLUE_VILLAIN";
    levelId: string;
  }>;
}

export async function submitScore(payload: SubmitScoreRequest): Promise<void> {
  await apiClient.post("/scores", payload);
}

export async function getUserScores(userId: string): Promise<unknown[]> {
  const res = await apiClient.get(`/scores/${userId}`);
  return res.data;
}

export async function getUserLevelScores(
  userId: string,
  levelId: string,
): Promise<unknown[]> {
  const res = await apiClient.get(`/scores/${userId}/${levelId}`);
  return res.data;
}

export interface UserCollectibleRecord {
  id: string;
  userId: string;
  collectibleId: string;
  collectibleType: "CLUE_VILLAIN";
  levelId: string;
  collectedAt: string;
}

export async function getUserCollectibles(
  userId: string,
  options?: {
    levelId?: string;
    collectibleType?: "CLUE_VILLAIN";
  },
): Promise<UserCollectibleRecord[]> {
  const params = new URLSearchParams();
  if (options?.levelId) params.set("levelId", options.levelId);
  if (options?.collectibleType) {
    params.set("collectibleType", options.collectibleType);
  }
  const query = params.toString();
  const url = query
    ? `/scores/${userId}/collectibles?${query}`
    : `/scores/${userId}/collectibles`;
  const res = await apiClient.get<UserCollectibleRecord[]>(url);
  return res.data;
}
