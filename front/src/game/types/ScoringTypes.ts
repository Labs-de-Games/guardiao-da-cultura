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
  quartersEarned: number; // 0..4
  completedAt: IsoTimestamp | null;
}

export interface CollectiblesScore {
  total: number; // expected: 4
  interactionsCount: number; // 0..total
  quartersEarned: number; // 0..total
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
  quartersEarned: number; // 0..4 (1 quarter per 25%)
  completedAt: IsoTimestamp | null;
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
    };

export interface ScoringPayload {
  levelId: string;
  startedAt: IsoTimestamp;

  floors: [FloorScore, FloorScore, FloorScore];
  collectibles: CollectiblesScore;
  quiz: QuizScore;

  totalQuarters: number; // 0..20
  totalStars: number; // totalQuarters / 4
  rating: ScoringRatingPTBR;

  // Detailed timeline for debugging/analytics.
  events: ScoringEventRecord[];
  updatedAt: IsoTimestamp;
}
