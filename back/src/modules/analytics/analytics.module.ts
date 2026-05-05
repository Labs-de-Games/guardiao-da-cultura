import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsService } from "./analytics.service";
import { GameEvent } from "./game-event.entity";

@Module({
  imports: [TypeOrmModule.forFeature([GameEvent])],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
