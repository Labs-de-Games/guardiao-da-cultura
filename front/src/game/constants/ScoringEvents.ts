export const ScoringEvents = {
  SCORE_UPDATED: "score-updated",
  FLOOR_ERROR_RECORDED: "floor-error-recorded",
  FLOOR_COMPLETED: "floor-completed",
  QUIZ_COMPLETED: "quiz-completed",
  INTERMEDIATE_QUIZ_COMPLETED: "intermediate-quiz-completed",
} as const;

export type ScoringEventName =
  (typeof ScoringEvents)[keyof typeof ScoringEvents];
