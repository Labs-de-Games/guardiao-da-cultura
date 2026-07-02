import type { UserProgressState } from "@/game/types/ProgressionTypes";
import { apiClient } from "./api/client";

function parseJsonField<T>(value: string | T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return {} as T;
    }
  }
  return value as T;
}

function normalizeProgress(data: Record<string, unknown>): UserProgressState {
  return {
    currentLevel: (data.currentLevel as number) ?? 1,
    totalStars: (data.totalStars as number) ?? 0,
    completedLevels: parseJsonField<Record<string, unknown>>(
      data.completedLevels as string | Record<string, unknown>,
    ) as UserProgressState["completedLevels"],
    clues: parseJsonField<Record<string, unknown>>(
      data.clues as string | Record<string, unknown>,
    ) as UserProgressState["clues"],
    quizResults: parseJsonField<Record<string, unknown>>(
      data.quizResults as string | Record<string, unknown>,
    ) as UserProgressState["quizResults"],
    intermediateQuizResults: parseJsonField<Record<string, unknown>>(
      data.intermediateQuizResults as string | Record<string, unknown>,
    ) as UserProgressState["intermediateQuizResults"],
  };
}

export async function getProgression(
  userId: string,
): Promise<UserProgressState | null> {
  try {
    const res = await apiClient.get(`/progression/${userId}`);
    if (!res.data) return null;
    return normalizeProgress(res.data);
  } catch {
    return null;
  }
}

export async function saveProgression(
  userId: string,
  state: UserProgressState,
): Promise<void> {
  await apiClient.put(`/progression/${userId}`, state);
}
