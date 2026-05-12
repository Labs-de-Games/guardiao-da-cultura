import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { SubmitScoreDto } from "./dto/submit-score.dto";
import { UserScore } from "./user-score.entity";

@Injectable()
export class ScoringService {
  constructor(
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
      interactibleScore: dto.interactibles,
    });

    return this.userScoreRepository.save(userScore);
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
