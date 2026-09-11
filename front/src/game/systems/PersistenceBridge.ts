import Cookies from "js-cookie";
import posthog from "posthog-js";
import {
  createGamePersistence,
  type GamePersistence,
  type ScorePersistencePayload,
} from "@/lib/persistence/gamePersistence";
import type { ProgressionManager } from "../objects/ProgressionManager";
import type { QuestManager } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import type { CollectibleSystem } from "./CollectibleSystem";

/**
 * Handles all backend persistence operations for the Game scene.
 * Extracted from Game.ts to separate persistence concerns from game logic.
 */
export class PersistenceBridge {
  public readonly persistence: GamePersistence;

  constructor(
    mode: "guest" | "auth",
    actorId: string | null,
    private scoreManager: ScoreManager,
    private progressionManager: ProgressionManager,
    private collectibleSystem: CollectibleSystem,
    private questManager: QuestManager,
    private levelId: string,
  ) {
    this.persistence = createGamePersistence({ mode, actorId });
  }

  async initializeCollectibles(): Promise<void> {
    try {
      const collected = await this.persistence.loadCollectibles(this.levelId);
      this.collectibleSystem.applyCollectedCollectibles(collected);

      for (const record of collected) {
        this.progressionManager.recordClueUnlocked(
          record.collectibleId,
          this.levelId,
        );
        this.questManager.collectInfo(`pista_${record.collectibleId}`);
      }
    } catch (err) {
      console.warn("[PersistenceBridge] Failed to load collectibles:", err);
    }
  }

  async saveCollectibles(): Promise<void> {
    try {
      const collectibles = this.collectibleSystem.getCollectedCollectibles();
      await this.persistence.saveCollectibles(this.levelId, collectibles);
    } catch (err) {
      console.warn("[PersistenceBridge] Failed to save collectibles:", err);
    }
  }

  async initializeProgression(): Promise<void> {
    try {
      const snapshot = await this.persistence.loadProgress();
      if (snapshot) {
        this.progressionManager.hydrate(snapshot);
      }
    } catch (err) {
      console.warn("[PersistenceBridge] Failed to load progression:", err);
    }
  }

  async submitScore(): Promise<void> {
    try {
      const payload = this.scoreManager.getPayload();

      const persistencePayload: ScorePersistencePayload = {
        levelId: payload.levelId,
        totalQuarters: payload.totalQuarters,
        totalStars: payload.totalStars,
        rating: payload.rating,
        floors: payload.floors.map((f) => ({
          floorIndex: f.floorIndex,
          errors: f.errors,
          quartersEarned: f.quartersEarned,
        })),
        quiz: {
          totalQuestions: payload.quiz.totalQuestions,
          correctAnswers: payload.quiz.correctAnswers,
          accuracyPercent: payload.quiz.accuracyPercent,
          quartersEarned: payload.quiz.quartersEarned,
        },
        intermediateQuizzes: {
          total: payload.intermediateQuizzes.total,
          passed: payload.intermediateQuizzes.passed,
          quartersEarned: payload.intermediateQuizzes.quartersEarned,
        },
        collectedCollectibles: this.collectibleSystem
          .getCollectedCollectibles()
          .map((c) => ({
            collectibleId: c.collectibleId,
            collectibleType: c.collectibleType,
            levelId: payload.levelId,
          })),
      };

      await this.persistence.saveScore(persistencePayload);

      posthog.capture("score_updated", {
        level_id: payload.levelId,
        total_quarters: payload.totalQuarters,
        total_stars: payload.totalStars,
        rating: payload.rating,
        floor_scores: payload.floors,
        quiz_score: {
          total_questions: payload.quiz.totalQuestions,
          correct_answers: payload.quiz.correctAnswers,
          accuracy_percent: payload.quiz.accuracyPercent,
          quarters_earned: payload.quiz.quartersEarned,
        },
      });
      // Canonical dual-emit (issue #741). High volume, but not a card
      // denominator — kept for completeness, not funnel math.
      posthog.capture("score_calculated", {
        level_id: payload.levelId,
        total_quarters: payload.totalQuarters,
        total_stars: payload.totalStars,
        rating: payload.rating,
      });
    } catch (err) {
      console.error(
        "[PersistenceBridge] Failed to save score in persistence layer:",
        err,
      );
    }
  }

  async saveProgress(): Promise<void> {
    try {
      const state = this.progressionManager.getState();
      await this.persistence.saveProgress(state);
      // Keep the cookie in sync so MapIntroScene can read it on the next visit
      Cookies.set("currentLevel", String(state.currentLevel), { expires: 365 });
    } catch (err) {
      console.error(
        "[PersistenceBridge] Failed to save progression in persistence layer:",
        err,
      );
    }
  }

  async sendQuizOutcome(
    payload: Parameters<GamePersistence["sendQuizOutcome"]>[0],
  ): Promise<void> {
    try {
      await this.persistence.sendQuizOutcome(payload);
    } catch (err) {
      console.error("[PersistenceBridge] Failed to send quiz outcome:", err);
    }
  }
}
