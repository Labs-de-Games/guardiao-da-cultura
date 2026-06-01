import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { GameEventPayload } from "../../shared/events/game-events";
import { UserProgress } from "./user-progress.entity";

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value === "string" && value) {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

@Injectable()
export class ProgressionService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly progressRepository: Repository<UserProgress>,
  ) {}

  @OnEvent("level.completed")
  async handleLevelCompleted(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const progress = await this.findOrCreate(payload.userId);
    const meta = payload.metadata ?? {};

    const completedLevels = parseJson(progress.completedLevels);
    const levelId = String(meta.levelId ?? "");
    let starsToGain = 0;

    if (levelId) {
      const existingLevel = completedLevels[levelId] as
        | { stars?: number; score?: number }
        | undefined;
      const previousStars =
        typeof existingLevel?.stars === "number" ? existingLevel.stars : 0;
      const previousScore =
        typeof existingLevel?.score === "number" ? existingLevel.score : 0;
      const newStars = typeof meta.stars === "number" ? meta.stars : 0;
      const newScore = typeof meta.score === "number" ? meta.score : 0;

      if (
        !existingLevel ||
        newStars > previousStars ||
        newScore > previousScore
      ) {
        completedLevels[levelId] = {
          completedAt: payload.timestamp,
          score: Math.max(previousScore, newScore),
          stars: Math.max(previousStars, newStars),
        };
      }

      if (newStars > previousStars) {
        starsToGain = newStars - previousStars;
      }
    } else {
      const newStars = typeof meta.stars === "number" ? meta.stars : 0;
      starsToGain = newStars;
    }

    const totalStars = progress.totalStars + starsToGain;

    const currentLevel =
      typeof meta.levelNumber === "number"
        ? Math.max(progress.currentLevel, meta.levelNumber + 1)
        : progress.currentLevel;

    await this.progressRepository.update(progress.id, {
      completedLevels: JSON.stringify(completedLevels),
      totalStars,
      currentLevel,
    });
  }

  @OnEvent("star.collected")
  async handleStarCollected(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const progress = await this.findOrCreate(payload.userId);
    const meta = payload.metadata ?? {};
    const value = meta.value ?? 1;

    await this.progressRepository.update(progress.id, {
      totalStars: progress.totalStars + (typeof value === "number" ? value : 1),
    });
  }

  @OnEvent("clue.used")
  async handleClueUsed(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const progress = await this.findOrCreate(payload.userId);
    const meta = payload.metadata ?? {};
    const clues = parseJson(progress.clues);
    const clueId = String(meta.clueId ?? "");

    if (clueId) {
      clues[clueId] = {
        usedAt: payload.timestamp,
        levelId: meta.levelId ?? null,
      };
    }

    await this.progressRepository.update(progress.id, {
      clues: JSON.stringify(clues),
    });
  }

  @OnEvent("clue.unlocked")
  async handleClueUnlocked(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const progress = await this.findOrCreate(payload.userId);
    const meta = payload.metadata ?? {};
    const clues = parseJson(progress.clues);
    const clueId = String(meta.clueId ?? "");

    if (clueId) {
      clues[clueId] = {
        unlockedAt: payload.timestamp,
        levelId: meta.levelId ?? null,
      };
    }

    await this.progressRepository.update(progress.id, {
      clues: JSON.stringify(clues),
    });
  }

  @OnEvent("quiz.completed")
  async handleQuizCompleted(payload: GameEventPayload): Promise<void> {
    await this.handleQuizEvent(payload);
  }

  @OnEvent("quiz.failed")
  async handleQuizFailed(payload: GameEventPayload): Promise<void> {
    await this.handleQuizEvent(payload);
  }

  async findByUserId(userId: string): Promise<UserProgress | null> {
    return this.progressRepository.findOne({ where: { userId } });
  }

  private async findOrCreate(userId: string): Promise<UserProgress> {
    await this.progressRepository
      .createQueryBuilder()
      .insert()
      .into(UserProgress)
      .values({ userId })
      .orIgnore()
      .execute();

    const progress = await this.progressRepository.findOne({
      where: { userId },
    });

    if (!progress) {
      throw new Error(
        `[ProgressionService] Failed to find or create progress for userId=${userId}`,
      );
    }

    return progress;
  }

  private async handleQuizEvent(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const progress = await this.findOrCreate(payload.userId);
    const meta = payload.metadata ?? {};

    const quizResults = parseJson(progress.quizResults);
    const missionId = String(meta.missionId ?? "");
    if (!missionId) return;

    quizResults[missionId] = {
      completedAt: payload.timestamp,
      passed: meta.passed ?? false,
      score: meta.score ?? 0,
      totalQuestions: meta.totalQuestions ?? 0,
      accuracyPercent: meta.accuracyPercent ?? 0,
      quartersEarned: meta.quartersEarned ?? 0,
      timeSpentMs: meta.timeSpentMs ?? null,
      attempts: meta.attempts ?? null,
      payload: meta.payload ?? null,
    };

    await this.progressRepository.update(progress.id, {
      quizResults: JSON.stringify(quizResults),
    });
  }
}
