import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { User } from "../users/user.entity";
import { Badge } from "./badge.entity";
import { BadgesService } from "./badges.service";
import { UserBadge } from "./user-badge.entity";

@Controller("badges")
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  async findAll(): Promise<Badge[]> {
    return this.badgesService.findAll();
  }

  @Get("me")
  async findMyBadges(@CurrentUser() user: User): Promise<UserBadge[]> {
    return this.badgesService.findUserBadges(user.id);
  }

  @Get(":userId")
  async findUserBadges(@Param("userId") userId: string): Promise<UserBadge[]> {
    return this.badgesService.findUserBadges(userId);
  }

  @Post("unlock")
  async unlockBadge(
    @Body() dto: { badgeId: string },
    @CurrentUser() user: User,
  ): Promise<UserBadge | null> {
    return this.badgesService.unlockBadge(user.id, dto.badgeId);
  }
}
