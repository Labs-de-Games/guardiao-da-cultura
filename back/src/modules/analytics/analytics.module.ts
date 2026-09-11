import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsService } from "./analytics.service";
import { GameEvent } from "./game-event.entity";

// AnalyticsController removed (#748): /analytics/aggregated and
// /analytics/classes served fabricated per-student data (invented names,
// class counts, badge counts) behind @Roles(Institution, Admin) — the
// worst item in the repo on an LGPD-sensitive, edital-audited surface.
// AnalyticsService/GameEvent/sendGameEvent stay; nothing reads game_event
// through a controller anymore, only through MetricsController's
// aggregate queries (dashboard.module.ts).
@Module({
  imports: [TypeOrmModule.forFeature([GameEvent])],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
