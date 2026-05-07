import { env } from "./env";

const API_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

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
  interactibles: {
    total: number;
    interactionsCount: number;
    quartersEarned: number;
  };
}

export async function submitScore(payload: SubmitScoreRequest): Promise<void> {
  const res = await fetch(`${API_URL}/scores`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to submit score: ${res.statusText}`);
  }
}

export async function getUserScores(userId: string): Promise<unknown[]> {
  const res = await fetch(`${API_URL}/scores/${userId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch user scores: ${res.statusText}`);
  }

  return res.json();
}

export async function getUserLevelScores(
  userId: string,
  levelId: string,
): Promise<unknown[]> {
  const res = await fetch(`${API_URL}/scores/${userId}/${levelId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch level scores: ${res.statusText}`);
  }

  return res.json();
}
