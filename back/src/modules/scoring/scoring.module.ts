import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScoringController } from "./scoring.controller";
import { ScoringService } from "./scoring.service";
import { UserCollectible } from "./user-collectible.entity";
import { UserCollectibleService } from "./user-collectible.service";
import { UserScore } from "./user-score.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserScore, UserCollectible])],
  controllers: [ScoringController],
  providers: [ScoringService, UserCollectibleService],
  exports: [ScoringService],
})
export class ScoringModule {}
