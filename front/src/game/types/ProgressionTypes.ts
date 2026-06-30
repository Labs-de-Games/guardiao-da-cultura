export interface CompletedLevelRecord {
  completedAt: string;
  score: number;
  stars: number;
}

export interface ClueRecord {
  unlockedAt?: string;
  usedAt?: string;
  levelId?: string | null;
}

export interface QuizResultRecord {
  completedAt: string;
  passed: boolean;
  score: number;
  totalQuestions: number;
  accuracyPercent: number;
  quartersEarned: number;
  timeSpentMs: number | null;
  attempts: number | null;
  payload: Record<string, unknown> | null;
}

export interface UserProgressState {
  currentLevel: number;
  totalStars: number;
  completedLevels: Record<string, CompletedLevelRecord>;
  clues: Record<string, ClueRecord>;
  quizResults: Record<string, QuizResultRecord>;
}
