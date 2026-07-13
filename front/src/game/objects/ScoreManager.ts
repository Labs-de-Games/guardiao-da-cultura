import * as Phaser from "phaser";
import { ScoringEvents } from "../constants/ScoringEvents";
import type {
  CollectibleInteraction,
  CollectiblesScore,
  FloorScore,
  IntermediateQuizzesScore,
  IsoTimestamp,
  QuizScore,
  ScoringEventRecord,
  ScoringPayload,
  ScoringRatingPTBR,
} from "../types/ScoringTypes";

export interface ScoreManagerOptions {
  levelId: string;
  floorsTotal?: number;
  // collectiblesTotal is deprecated - no longer affects scoring
  collectiblesTotal?: number;
}

export class ScoreManager extends Phaser.Events.EventEmitter {
  private readonly levelId: string;
  private readonly floorsTotal: number;
  private readonly collectiblesTotal: number;

  private readonly startedAt: IsoTimestamp;
  private updatedAt: IsoTimestamp;

  private floors: [FloorScore, FloorScore, FloorScore];
  private collectibles: CollectiblesScore;
  private quiz: QuizScore;
  private intermediateQuizzes: IntermediateQuizzesScore;
  private events: ScoringEventRecord[];

  constructor(options: ScoreManagerOptions) {
    super();
    this.levelId = options.levelId;
    this.floorsTotal = options.floorsTotal ?? 3;
    this.collectiblesTotal = options.collectiblesTotal ?? 4;

    if (this.floorsTotal !== 3) {
      throw new Error(
        `[ScoreManager] MVP expects floorsTotal=3, got ${this.floorsTotal}`,
      );
    }

    this.startedAt = this.nowIso();
    this.updatedAt = this.startedAt;

    this.floors = [0, 1, 2].map((i) => ({
      floorIndex: i,
      errors: 0,
      quartersEarned: 1 as 1 | 2,
      completedAt: null,
    })) as [FloorScore, FloorScore, FloorScore];

    this.collectibles = {
      total: this.collectiblesTotal,
      interactionsCount: 0,
      quartersEarned: 0,
      lastInteractionAt: null,
      interactions: [],
    };

    this.quiz = {
      totalQuestions: 0,
      correctAnswers: 0,
      accuracyPercent: 0,
      quartersEarned: 0,
      completedAt: null,
    };

    this.intermediateQuizzes = {
      total: 0,
      passed: 0,
      quartersEarned: 0,
    };

    this.events = [{ type: "level-started", occurredAt: this.startedAt }];
  }

  recordFloorError(floorIndex: number) {
    const floor = this.floors[floorIndex];
    if (!floor) return;
    if (floor.completedAt) return;

    floor.errors += 1;
    const occurredAt = this.touch();
    this.events.push({ type: "floor-error", floorIndex, occurredAt });

    const payload = this.getPayload();
    this.emit(ScoringEvents.FLOOR_ERROR_RECORDED, {
      floorIndex,
      errors: floor.errors,
      payload,
    });
    this.emit(ScoringEvents.SCORE_UPDATED, payload);
  }

  completeFloor(floorIndex: number) {
    const floor = this.floors[floorIndex];
    if (!floor) return;
    if (floor.completedAt) return;

    const quartersEarned = this.computeFloorQuarters(floor.errors);
    floor.quartersEarned = quartersEarned;
    floor.completedAt = this.touch();

    this.events.push({
      type: "floor-completed",
      floorIndex,
      errors: floor.errors,
      quartersEarned,
      occurredAt: floor.completedAt,
    });

    const payload = this.getPayload();
    this.emit(ScoringEvents.FLOOR_COMPLETED, {
      floorIndex,
      errors: floor.errors,
      quartersEarned,
      payload,
    });
    this.emit(ScoringEvents.SCORE_UPDATED, payload);
  }

  recordCollectible(collectibleId: string, collectibleType: string) {
    if (this.collectibles.interactionsCount >= this.collectibles.total) {
      return;
    }

    const isNewInteraction = this.addCollectibleInteraction(
      collectibleId,
      collectibleType,
    );
    if (!isNewInteraction) {
      return;
    }

    this.collectibles.interactionsCount += 1;
    // Collectibles no longer affect scoring - quartersEarned stays 0
    this.collectibles.quartersEarned = 0;
    this.collectibles.lastInteractionAt = this.touch();

    this.events.push({
      type: "collectible",
      occurredAt: this.collectibles.lastInteractionAt,
    });

    const payload = this.getPayload();
    this.emit(ScoringEvents.COLLECTIBLE_USED, {
      interactionsCount: this.collectibles.interactionsCount,
      payload,
    });
    this.emit(ScoringEvents.SCORE_UPDATED, payload);
  }

  private addCollectibleInteraction(
    collectibleId: string,
    collectibleType: string,
  ): boolean {
    if (!collectibleId) {
      return false;
    }

    const alreadyTracked = this.collectibles.interactions.some(
      (interaction) =>
        interaction.collectible_id === collectibleId &&
        interaction.collectible_type === collectibleType,
    );

    if (alreadyTracked) {
      return false;
    }

    const interaction: CollectibleInteraction = {
      collectible_id: collectibleId,
      collectible_type: collectibleType,
      interactedAt: this.nowIso(),
    };

    this.collectibles.interactions.push(interaction);
    return true;
  }

  recordQuizResult(correctAnswers: number, totalQuestions: number) {
    const total = Math.max(0, Math.floor(totalQuestions));
    const correct = Math.min(Math.max(0, Math.floor(correctAnswers)), total);

    const accuracyPercent = total > 0 ? Math.floor((correct / total) * 100) : 0;
    // New: 1 quarter per correct answer, max 5
    const quartersEarned = Math.min(5, correct);

    this.quiz.totalQuestions = total;
    this.quiz.correctAnswers = correct;
    this.quiz.accuracyPercent = accuracyPercent;
    this.quiz.quartersEarned = quartersEarned;
    this.quiz.completedAt = this.touch();

    this.events.push({
      type: "quiz-completed",
      totalQuestions: total,
      correctAnswers: correct,
      accuracyPercent,
      quartersEarned,
      occurredAt: this.quiz.completedAt,
    });

    const payload = this.getPayload();
    this.emit(ScoringEvents.QUIZ_COMPLETED, {
      correctAnswers: correct,
      totalQuestions: total,
      accuracyPercent,
      quartersEarned,
      payload,
    });
    this.emit(ScoringEvents.SCORE_UPDATED, payload);
  }

  recordIntermediateQuizResult(
    infoKey: string,
    correctAnswers: number,
    totalQuestions: number,
  ) {
    const occurredAt = this.touch();
    this.intermediateQuizzes.total += 1;

    const correct = Math.min(
      Math.max(0, Math.floor(correctAnswers)),
      totalQuestions,
    );
    const quartersEarned = Math.min(3, correct);
    this.intermediateQuizzes.quartersEarned += quartersEarned;

    if (correct >= Math.ceil(totalQuestions / 2)) {
      this.intermediateQuizzes.passed += 1;
    }

    this.events.push({
      type: "intermediate-quiz-completed",
      infoKey,
      correctAnswers: correct,
      totalQuestions,
      quartersEarned,
      occurredAt,
    });

    const payload = this.getPayload();
    this.emit(ScoringEvents.INTERMEDIATE_QUIZ_COMPLETED, {
      infoKey,
      correctAnswers: correct,
      totalQuestions,
      quartersEarned,
      payload,
    });
    this.emit(ScoringEvents.SCORE_UPDATED, payload);
  }

  getLevelId(): string {
    return this.levelId;
  }

  getMaxStars(): number {
    // New: floors (2 each) + quiz (5) + intermediate quizzes (3 per quiz, assume 3) = 6 + 5 + 9 = 20
    const quizMaxQuarters = 5;
    const intermediateQuizMaxQuarters = 9; // 3 quizzes x 3 quarters each
    const maxQuarters =
      this.floorsTotal * 2 + quizMaxQuarters + intermediateQuizMaxQuarters;
    return maxQuarters / 4;
  }

  getPayload(): ScoringPayload {
    const totalQuarters = this.computeTotalQuarters();
    return {
      levelId: this.levelId,
      startedAt: this.startedAt,
      floors: this.floors.map((floor) => ({ ...floor })) as [
        FloorScore,
        FloorScore,
        FloorScore,
      ],
      collectibles: { ...this.collectibles },
      quiz: { ...this.quiz },
      intermediateQuizzes: { ...this.intermediateQuizzes },
      totalQuarters,
      totalStars: totalQuarters / 4,
      rating: this.computeRating(totalQuarters),
      events: [...this.events],
      updatedAt: this.updatedAt,
    };
  }

  private computeTotalQuarters(): number {
    const floorsQuarters = this.floors.reduce(
      (sum, floorScore) => sum + (floorScore.quartersEarned || 0),
      0,
    );
    return Math.max(
      0,
      floorsQuarters +
        this.quiz.quartersEarned +
        this.intermediateQuizzes.quartersEarned,
    );
  }

  private computeFloorQuarters(errors: number): 1 | 2 {
    // New: 0 errors = 2 quarters, ≥1 error = 1 quarter
    return errors === 0 ? 2 : 1;
  }

  private computeRating(totalQuarters: number): ScoringRatingPTBR {
    if (totalQuarters >= 20) return "perfeito";
    if (totalQuarters >= 16) return "ótimo";
    if (totalQuarters >= 12) return "bom";
    if (totalQuarters >= 8) return "regular";
    return "mínimo";
  }

  private touch(): IsoTimestamp {
    this.updatedAt = this.nowIso();
    return this.updatedAt;
  }

  private nowIso(): IsoTimestamp {
    return new Date().toISOString();
  }
}
