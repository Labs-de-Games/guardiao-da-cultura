import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { SubmitScoreDto } from "./dto/submit-score.dto";
import { ScoringService } from "./scoring.service";
import { UserScore } from "./user-score.entity";

@Controller("scores")
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Post()
  async submitScore(@Body() dto: SubmitScoreDto): Promise<UserScore> {
    return this.scoringService.submitScore(dto);
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
