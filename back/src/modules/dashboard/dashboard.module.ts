import { Module } from "@nestjs/common";
import { AnalyticsModule } from "../analytics/analytics.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { MetricsController } from "./metrics.controller";

@Module({
  imports: [AnalyticsModule],
  controllers: [DashboardController, MetricsController],
  providers: [DashboardService],
})
export class DashboardModule {}
