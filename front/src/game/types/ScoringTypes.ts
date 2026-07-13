// Scoring payload types for quarter-star based scoring.
// This is designed to be JSON-serializable (timestamps as ISO strings).

export type IsoTimestamp = string;

export type ScoringRatingPTBR =
  | "mínimo"
  | "regular"
  | "bom"
  | "ótimo"
  | "perfeito";

export interface FloorScore {
  floorIndex: number; // 0..2
  errors: number;
  quartersEarned: 0 | 1 | 2; // 0 = incomplete, 1 = completed with ≥1 error, 2 = completed with 0 errors
  completedAt: IsoTimestamp | null;
}

/**
 * @deprecated Collectibles are no longer part of scoring. Kept for backward compatibility.
 */
export interface CollectiblesScore {
  total: number; // expected: 4
  interactionsCount: number; // 0..total
  quartersEarned: number; // deprecated: always 0
  lastInteractionAt: IsoTimestamp | null;
  interactions: CollectibleInteraction[];
}

export interface CollectibleInteraction {
  collectible_id: string;
  collectible_type: string;
  interactedAt: IsoTimestamp;
}

export interface QuizScore {
  totalQuestions: number;
  correctAnswers: number;
  accuracyPercent: number; // 0..100
  quartersEarned: number; // 0..5 (1 quarter per correct answer)
  completedAt: IsoTimestamp | null;
}

export interface IntermediateQuizzesScore {
  total: number; // number of intermediate quizzes attempted
  passed: number; // number of intermediate quizzes passed
  quartersEarned: number; // quarters earned (0.25 per correct answer, max 3 per quiz)
}

export type ScoringEventRecord =
  | { type: "level-started"; occurredAt: IsoTimestamp }
  | {
      type: "floor-error";
      floorIndex: number;
      occurredAt: IsoTimestamp;
    }
  | {
      type: "floor-completed";
      floorIndex: number;
      errors: number;
      quartersEarned: number;
      occurredAt: IsoTimestamp;
    }
  | { type: "collectible"; occurredAt: IsoTimestamp }
  | {
      type: "quiz-completed";
      totalQuestions: number;
      correctAnswers: number;
      accuracyPercent: number;
      quartersEarned: number;
      occurredAt: IsoTimestamp;
    }
  | {
      type: "intermediate-quiz-completed";
      infoKey: string;
      correctAnswers: number;
      totalQuestions: number;
      quartersEarned: number;
      occurredAt: IsoTimestamp;
    };

export interface ScoringPayload {
  levelId: string;
  startedAt: IsoTimestamp;

  floors: [FloorScore, FloorScore, FloorScore];
  collectibles: CollectiblesScore;
  quiz: QuizScore;
  intermediateQuizzes: IntermediateQuizzesScore;

  totalQuarters: number; // 0..20
  totalStars: number; // totalQuarters / 4
  rating: ScoringRatingPTBR;

  // Detailed timeline for debugging/analytics.
  events: ScoringEventRecord[];
  updatedAt: IsoTimestamp;
}
