import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { DashboardService } from "./dashboard.service";
import { MetricsController } from "./metrics.controller";

// DashboardController removed (#748): byte-for-byte duplicate of
// MetricsController with no consumer — the front calls GET /metrics.
// DashboardService/GET /metrics kept deliberately as the Postgres
// fallback dashboard until the new PostHog-backed screens (#745) run a
// full apuração cycle in production.
@Module({
  imports: [AnalyticsModule],
  controllers: [MetricsController],
  providers: [DashboardService],
})
export class DashboardModule {}
