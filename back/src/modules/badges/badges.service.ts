import { Injectable } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent("badge.earned")
  async handleBadgeEarned(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const meta = payload.metadata ?? {};
    const badgeId = String(meta.badgeId ?? "");
    if (!badgeId) return;

    await this.userBadgeRepository.upsert(
      { userId: payload.userId, badgeId },
      {
        conflictPaths: ["userId", "badgeId"],
        skipUpdateIfNoValuesChanged: true,
      },
    );
  }

  @OnEvent("level.completed")
  async handleLevelCompleted(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

    const meta = payload.metadata ?? {};
    const levelId = String(meta.levelId ?? "");
    if (!levelId) return;

    const badges = await this.badgeRepository.find({
      where: { type: BadgeType.LEVEL },
    });

    for (const badge of badges) {
      if (badge.name.toLowerCase().includes(levelId.toLowerCase())) {
        await this.awardBadgeIfNotExists(payload.userId, badge.id);
      }
    }
  }

  @OnEvent("star.collected")
  async handleStarCollected(payload: GameEventPayload): Promise<void> {
    if (!payload.userId) return;

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
    await this.userBadgeRepository.upsert(
      { userId, badgeId },
      {
        conflictPaths: ["userId", "badgeId"],
        skipUpdateIfNoValuesChanged: true,
      },
    );
  }

  async findAll(): Promise<Badge[]> {
    return this.badgeRepository.find();
  }

  async findUserBadges(userId: string): Promise<UserBadge[]> {
    return this.userBadgeRepository.find({
      where: { userId },
      relations: ["badge"],
      order: { earnedAt: "DESC" },
    });
  }

  async unlockBadge(
    userId: string,
    badgeId: string,
  ): Promise<UserBadge | null> {
    await this.userBadgeRepository.upsert(
      { userId, badgeId },
      {
        conflictPaths: ["userId", "badgeId"],
        skipUpdateIfNoValuesChanged: true,
      },
    );

    const saved = await this.userBadgeRepository.findOne({
      where: { userId, badgeId },
    });

    if (!saved) return null;

    const badge = await this.badgeRepository.findOne({
      where: { id: badgeId },
    });
    this.eventEmitter.emit("badge.earned", {
      userId,
      type: "badge.earned",
      timestamp: new Date(),
      metadata: { badgeId, badgeName: badge?.name },
    } as GameEventPayload);

    return saved;
  }
}
