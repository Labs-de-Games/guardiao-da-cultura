import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import type { Repository } from "typeorm";
import { PostHogService } from "../posthog/posthog.service";
import type { SubmitScoreDto } from "./dto/submit-score.dto";
import { UserCollectibleService } from "./user-collectible.service";
import { UserScore } from "./user-score.entity";

@Injectable()
export class ScoringService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(UserScore)
    private readonly userScoreRepository: Repository<UserScore>,
    private readonly posthog: PostHogService,
    private readonly userCollectibleService: UserCollectibleService,
  ) {}

  async submitScore(dto: SubmitScoreDto): Promise<UserScore> {
    const collected = dto.collectedCollectibles ?? [];
    await this.userCollectibleService.recordCollectibles(
      collected.map((collectible) => ({
        userId: dto.userId,
        collectibleId: collectible.collectibleId,
        collectibleType: collectible.collectibleType,
        levelId: collectible.levelId,
      })),
    );

    const userScore = this.userScoreRepository.create({
      userId: dto.userId,
      levelId: dto.levelId,
      totalQuarters: dto.totalQuarters,
      totalStars: dto.totalStars,
      rating: dto.rating,
      floorScores: dto.floors,
      quizScore: dto.quiz,
      collectibleScore: dto.collectibles,
    });

    const saved = await this.userScoreRepository.save(userScore);

    this.posthog.capture({
      event: "match_ended",
      distinctId: dto.userId,
      properties: {
        level_id: dto.levelId,
        score: dto.totalQuarters,
        stars: dto.totalStars,
        rating: dto.rating,
        quiz_correct: dto.quiz.correctAnswers,
        quiz_total: dto.quiz.totalQuestions,
        quiz_accuracy: dto.quiz.accuracyPercent,
      },
    });

    this.logger.info(
      { userId: dto.userId, levelId: dto.levelId, scoreId: saved.id },
      "Score submitted",
    );
    return saved;
  }

  async findByUserId(userId: string): Promise<UserScore[]> {
    return this.userScoreRepository.find({
      where: { userId },
      order: { timestamp: "DESC" },
    });
  }

  async findByUserAndLevel(
    userId: string,
    levelId: string,
  ): Promise<UserScore[]> {
    return this.userScoreRepository.find({
      where: { userId, levelId },
      order: { timestamp: "DESC" },
    });
  }
}
