import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { GameEventPayload } from "../../shared/events/game-events";
import { Badge, BadgeType } from "./badge.entity";
import { UserBadge } from "./user-badge.entity";

@Injectable()
export class BadgesService {
  constructor(
    @InjectRepository(UserBadge)
    private readonly userBadgeRepository: Repository<UserBadge>,
    @InjectRepository(Badge)
    private readonly badgeRepository: Repository<Badge>,
  ) {}

  @OnEvent("badge.earned")
  async handleBadgeEarned(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const meta = payload.metadata ?? {};
    const badgeId = String(meta.badgeId ?? "");
    if (!badgeId) return;

    // Check if user already has this badge
    const existing = await this.userBadgeRepository.findOne({
      where: { userId: payload.userId, badgeId },
    });

    if (existing) return;

    const userBadge = this.userBadgeRepository.create({
      userId: payload.userId,
      badgeId,
    });

    await this.userBadgeRepository.save(userBadge);
  }

  @OnEvent("level.completed")
  async handleLevelCompleted(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    // Auto-check for level-related badges
    const meta = payload.metadata ?? {};
    const levelId = String(meta.levelId ?? "");
    if (!levelId) return;

    // Find badges that match this level completion criteria
    const badges = await this.badgeRepository.find({
      where: { type: BadgeType.LEVEL },
    });

    for (const badge of badges) {
      // Simple matching: badge name contains levelId
      if (badge.name.toLowerCase().includes(levelId.toLowerCase())) {
        await this.awardBadgeIfNotExists(payload.userId, badge.id);
      }
    }
  }

  @OnEvent("star.collected")
  async handleStarCollected(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    // Check for collection badges
    const badges = await this.badgeRepository.find({
      where: { type: BadgeType.COLLECTION },
    });

    for (const badge of badges) {
      await this.awardBadgeIfNotExists(payload.userId, badge.id);
    }
  }

  private async awardBadgeIfNotExists(
    userId: string,
    badgeId: string,
  ): Promise<void> {
    const existing = await this.userBadgeRepository.findOne({
      where: { userId, badgeId },
    });

    if (!existing) {
      const userBadge = this.userBadgeRepository.create({ userId, badgeId });
      await this.userBadgeRepository.save(userBadge);
    }
  }
}
