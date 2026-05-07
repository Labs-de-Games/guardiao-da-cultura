export class SubmitScoreDto {
  userId!: string;
  levelId!: string;
  totalQuarters!: number;
  totalStars!: number;
  rating!: string;
  floors!: Array<{
    floorIndex: number;
    errors: number;
    quartersEarned: number;
  }>;
  quiz!: {
    totalQuestions: number;
    correctAnswers: number;
    accuracyPercent: number;
    quartersEarned: number;
  };
  interactibles!: {
    total: number;
    interactionsCount: number;
    quartersEarned: number;
  };
}
