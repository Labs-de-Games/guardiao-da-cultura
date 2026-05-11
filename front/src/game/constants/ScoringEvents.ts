export const ScoringEvents = {
  SCORE_UPDATED: "score-updated",
  FLOOR_ERROR_RECORDED: "floor-error-recorded",
  FLOOR_COMPLETED: "floor-completed",
  COLLECTIBLE_USED: "collectible-used",
  QUIZ_COMPLETED: "quiz-completed",
} as const;

export type ScoringEventName =
  (typeof ScoringEvents)[keyof typeof ScoringEvents];
