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
    private readonly userCollectibleService: UserCollectibleService,
    private readonly posthog: PostHogService,
  ) {}

  /**
   * @param analyticsConsent the player's PostHog consent for this request
   *   (issue #864). The score is persisted either way; only the analytics
   *   event is gated.
   */
  async submitScore(
    dto: SubmitScoreDto,
    analyticsConsent: boolean,
  ): Promise<UserScore> {
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
      intermediateQuizScore: dto.intermediateQuizzes,
    });

    const saved = await this.userScoreRepository.save(userScore);

    this.posthog.capture({
      event: "match_ended",
      consent: analyticsConsent,
      distinctId: dto.userId,
      properties: {
        level_id: dto.levelId,
        score: dto.totalQuarters,
        stars: dto.totalStars,
        rating: dto.rating,
        quiz_correct: dto.quiz.correctAnswers,
        quiz_total: dto.quiz.totalQuestions,
        quiz_accuracy: dto.quiz.accuracyPercent,
        intermediate_quiz_total: dto.intermediateQuizzes.total,
        intermediate_quiz_passed: dto.intermediateQuizzes.passed,
        intermediate_quiz_net: dto.intermediateQuizzes.quartersEarned,
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
