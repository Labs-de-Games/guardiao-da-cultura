import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { UpdateProgressionDto } from "./dto/update-progression.dto";
import { UserProgress } from "./user-progress.entity";

@Injectable()
export class ProgressionService {
  constructor(
    @InjectRepository(UserProgress)
    private readonly progressRepository: Repository<UserProgress>,
  ) {}


  async findByUserId(userId: string): Promise<UserProgress | null> {
    return this.progressRepository.findOne({ where: { userId } });
  }

  async upsertProgress(
    userId: string,
    dto: UpdateProgressionDto,
  ): Promise<UserProgress> {
    const progress = await this.findOrCreate(userId);

    const updateData: Partial<UserProgress> = {};

    if (dto.currentLevel !== undefined)
      updateData.currentLevel = dto.currentLevel;
    if (dto.totalStars !== undefined) updateData.totalStars = dto.totalStars;
    if (dto.completedLevels !== undefined) {
      updateData.completedLevels = JSON.stringify(dto.completedLevels);
    }
    if (dto.clues !== undefined) updateData.clues = JSON.stringify(dto.clues);
    if (dto.quizResults !== undefined) {
      updateData.quizResults = JSON.stringify(dto.quizResults);
    }

    await this.progressRepository.update(progress.id, updateData);
    return this.progressRepository.findOneOrFail({
      where: { id: progress.id },
    });
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
}
