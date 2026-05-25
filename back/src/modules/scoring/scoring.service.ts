import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import type { Repository } from "typeorm";
import type { SubmitScoreDto } from "./dto/submit-score.dto";
import { UserScore } from "./user-score.entity";

@Injectable()
export class ScoringService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(UserScore)
    private readonly userScoreRepository: Repository<UserScore>,
  ) {}

  async submitScore(dto: SubmitScoreDto): Promise<UserScore> {
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
