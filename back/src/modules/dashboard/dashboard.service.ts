import { Injectable } from "@nestjs/common";
import { AnalyticsService } from "../analytics/analytics.service";
import type { DashboardMetricsDto } from "./dto/dashboard-metrics.dto";
import { DateRange } from "./dto/dashboard-query.dto";

@Injectable()
export class DashboardService {
  constructor(private readonly analyticsService: AnalyticsService) {}

  async getMetrics(
    dateRange: DateRange = DateRange.LAST_30_DAYS,
  ): Promise<DashboardMetricsDto> {
    return this.analyticsService.getDashboardMetrics(dateRange);
  }
}
