import * as Phaser from "phaser";
import { ProgressionEvents } from "../constants/ProgressionEvents";
import type {
  CompletedLevelRecord,
  IntermediateQuizResultRecord,
  QuizResultRecord,
  UserProgressState,
} from "../types/ProgressionTypes";

const DEFAULT_STATE: UserProgressState = {
  currentLevel: 1,
  totalStars: 0,
  completedLevels: {},
  clues: {},
  quizResults: {},
  intermediateQuizResults: {},
};

export class ProgressionManager extends Phaser.Events.EventEmitter {
  private state: UserProgressState;

  constructor() {
    super();
    this.state = {
      ...DEFAULT_STATE,
      completedLevels: {},
      clues: {},
      quizResults: {},
      intermediateQuizResults: {},
    };
  }

  hydrate(snapshot: UserProgressState): void {
    this.state = {
      currentLevel: snapshot.currentLevel ?? 1,
      totalStars: snapshot.totalStars ?? 0,
      completedLevels: { ...(snapshot.completedLevels ?? {}) },
      clues: { ...(snapshot.clues ?? {}) },
      quizResults: { ...(snapshot.quizResults ?? {}) },
      intermediateQuizResults: { ...(snapshot.intermediateQuizResults ?? {}) },
    };
    this.emit(ProgressionEvents.PROGRESSION_UPDATED, this.getState());
  }

  recordLevelCompleted(
    levelId: string,
    levelNumber: number,
    stars: number,
    score: number,
    completedAt: string,
  ): void {
    const existing = this.state.completedLevels[levelId];
    const previousStars = existing?.stars ?? 0;
    const previousScore = existing?.score ?? 0;

    const newStars = Math.max(previousStars, stars);
    const newScore = Math.max(previousScore, score);

    if (!existing || newStars > previousStars || newScore > previousScore) {
      const record: CompletedLevelRecord = {
        completedAt,
        score: newScore,
        stars: newStars,
      };
      this.state.completedLevels[levelId] = record;

      if (newStars > previousStars) {
        this.state.totalStars += newStars - previousStars;
      }
    }

    this.state.currentLevel = Math.max(
      this.state.currentLevel,
      levelNumber + 1,
    );

    this.emit(ProgressionEvents.PROGRESSION_UPDATED, this.getState());
  }

  recordClueUnlocked(clueId: string, levelId: string): void {
    const existing = this.state.clues[clueId];
    this.state.clues[clueId] = {
      ...(existing ?? {}),
      unlockedAt: new Date().toISOString(),
      levelId,
    };
    this.emit(ProgressionEvents.PROGRESSION_UPDATED, this.getState());
  }

  recordQuizResult(missionId: string, data: QuizResultRecord): void {
    this.state.quizResults[missionId] = { ...data };
    this.emit(ProgressionEvents.PROGRESSION_UPDATED, this.getState());
  }

  recordIntermediateQuizResult(
    infoKey: string,
    data: IntermediateQuizResultRecord,
  ): void {
    this.state.intermediateQuizResults[infoKey] = { ...data };
    this.emit(ProgressionEvents.PROGRESSION_UPDATED, this.getState());
  }

  getState(): UserProgressState {
    return {
      currentLevel: this.state.currentLevel,
      totalStars: this.state.totalStars,
      completedLevels: { ...this.state.completedLevels },
      clues: { ...this.state.clues },
      quizResults: { ...this.state.quizResults },
      intermediateQuizResults: { ...this.state.intermediateQuizResults },
    };
  }
}
