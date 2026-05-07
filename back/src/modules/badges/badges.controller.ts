import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { Badge } from "./badge.entity";
import { BadgesService } from "./badges.service";
import { UserBadge } from "./user-badge.entity";

interface UnlockBadgeDto {
  userId: string;
  badgeId: string;
}

@Controller("badges")
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  async findAll(): Promise<Badge[]> {
    return this.badgesService.findAll();
  }

  @Get(":userId")
  async findUserBadges(@Param("userId") userId: string): Promise<UserBadge[]> {
    return this.badgesService.findUserBadges(userId);
  }

  @Post("unlock")
  async unlockBadge(@Body() dto: UnlockBadgeDto): Promise<UserBadge | null> {
    return this.badgesService.unlockBadge(dto.userId, dto.badgeId);
  }
}
