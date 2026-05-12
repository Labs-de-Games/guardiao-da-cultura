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
