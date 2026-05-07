import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScoringController } from "./scoring.controller";
import { ScoringService } from "./scoring.service";
import { UserScore } from "./user-score.entity";

@Module({
  imports: [TypeOrmModule.forFeature([UserScore])],
  controllers: [ScoringController],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
