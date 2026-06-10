import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { GuestPlay } from "../auth/decorators/guest-play.decorator";
import { SubmitScoreDto } from "./dto/submit-score.dto";
import { UserCollectibleQueryDto } from "./dto/user-collectible-query.dto";
import { ScoringService } from "./scoring.service";
import { UserCollectible } from "./user-collectible.entity";
import { UserCollectibleService } from "./user-collectible.service";
import { UserScore } from "./user-score.entity";

@Controller("scores")
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly userCollectibleService: UserCollectibleService,
  ) {}

  @GuestPlay()
  @Post()
  async submitScore(
    @Body() dto: SubmitScoreDto,
    @Headers("x-guest-id") guestId: string | undefined,
  ): Promise<UserScore | { success: true; guest: true }> {
    if (guestId) {
      // Guest scores are not persisted; return success stub
      return { success: true, guest: true };
    }
    return this.scoringService.submitScore(dto);
  }

  @GuestPlay()
  @Get(":userId/collectibles")
  async getUserCollectibles(
    @Param("userId") userId: string,
    @Query() query: UserCollectibleQueryDto,
  ): Promise<UserCollectible[]> {
    return this.userCollectibleService.findByUser(userId, query);
  }

  @GuestPlay()
  @Get(":userId")
  async getUserScores(@Param("userId") userId: string): Promise<UserScore[]> {
    return this.scoringService.findByUserId(userId);
  }

  @GuestPlay()
  @Get(":userId/:levelId")
  async getUserLevelScores(
    @Param("userId") userId: string,
    @Param("levelId") levelId: string,
  ): Promise<UserScore[]> {
    return this.scoringService.findByUserAndLevel(userId, levelId);
  }
}
