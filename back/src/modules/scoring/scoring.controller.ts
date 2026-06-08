import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
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

  @Post()
  async submitScore(@Body() dto: SubmitScoreDto): Promise<UserScore> {
    return this.scoringService.submitScore(dto);
  }

  @Get(":userId/collectibles")
  async getUserCollectibles(
    @Param("userId") userId: string,
    @Query() query: UserCollectibleQueryDto,
  ): Promise<UserCollectible[]> {
    return this.userCollectibleService.findByUser(userId, query);
  }

  @Get(":userId")
  async getUserScores(@Param("userId") userId: string): Promise<UserScore[]> {
    return this.scoringService.findByUserId(userId);
  }

  @Get(":userId/:levelId")
  async getUserLevelScores(
    @Param("userId") userId: string,
    @Param("levelId") levelId: string,
  ): Promise<UserScore[]> {
    return this.scoringService.findByUserAndLevel(userId, levelId);
  }
}
