import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { GuestPlay } from "../auth/decorators/guest-play.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { User } from "../users/user.entity";
import { Badge } from "./badge.entity";
import { BadgesService } from "./badges.service";
import { UserBadge } from "./user-badge.entity";

@Controller("badges")
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Public()
  @Get()
  async findAll(): Promise<Badge[]> {
    return this.badgesService.findAll();
  }

  @GuestPlay()
  @Get("me")
  async findMyBadges(
    @CurrentUser() user: User | undefined,
  ): Promise<UserBadge[]> {
    if (!user) {
      return [];
    }
    return this.badgesService.findUserBadges(user.id);
  }

  @GuestPlay()
  @Get(":userId")
  async findUserBadges(@Param("userId") userId: string): Promise<UserBadge[]> {
    return this.badgesService.findUserBadges(userId);
  }

  @GuestPlay()
  @Post("unlock")
  async unlockBadge(
    @Body() dto: { badgeId: string },
    @CurrentUser() user: User | undefined,
  ): Promise<UserBadge | { success: true; guest: true } | null> {
    if (!user) {
      return { success: true, guest: true };
    }
    return this.badgesService.unlockBadge(user.id, dto.badgeId);
  }
}
