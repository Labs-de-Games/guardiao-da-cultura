import { Injectable } from "@nestjs/common";
import { DashboardMetricsDto } from "./dto/dashboard-metrics.dto";

import { DateRange } from "./dto/dashboard-query.dto";

@Injectable()
export class DashboardService {
  getMetrics(
    dateRange: DateRange = DateRange.LAST_30_DAYS,
  ): DashboardMetricsDto {
    if (dateRange === DateRange.LAST_7_DAYS) {
      return {
        funnel: {
          loginCompletionRate: 0.88,
          chapter1StartRate: 0.96,
          chapter1CompletionRate: 0.52,
        },
        engagement: {
          averageSessionTime: 4.1,
          totalPlayers: 45,
        },
        pedagogical: {
          quizSuccessRate: 0.78,
          averageStarScore: 4.0,
          objectInteractionRate: 0.95,
        },
        badges: {
          explorerRate: 0.35,
          restauradorRate: 0.28,
          curadorRate: 0.18,
          detetiveRate: 0.45,
          persistenteRate: 0.65,
        },
        technical: {
          errorFreeSessionRate: 0.99,
        },
      };
    }

    if (dateRange === DateRange.ALL_TIME) {
      return {
        funnel: {
          loginCompletionRate: 0.75,
          chapter1StartRate: 0.85,
          chapter1CompletionRate: 0.35,
        },
        engagement: {
          averageSessionTime: 3.1,
          totalPlayers: 1250,
        },
        pedagogical: {
          quizSuccessRate: 0.65,
          averageStarScore: 3.2,
          objectInteractionRate: 0.82,
        },
        badges: {
          explorerRate: 0.2,
          restauradorRate: 0.15,
          curadorRate: 0.05,
          detetiveRate: 0.25,
          persistenteRate: 0.4,
        },
        technical: {
          errorFreeSessionRate: 0.95,
        },
      };
    }

    return {
      funnel: {
        loginCompletionRate: 0.82,
        chapter1StartRate: 0.95,
        chapter1CompletionRate: 0.48,
      },
      engagement: {
        averageSessionTime: 3.5,
        totalPlayers: 250,
      },
      pedagogical: {
        quizSuccessRate: 0.75,
        averageStarScore: 3.8,
        objectInteractionRate: 0.92,
      },
      badges: {
        explorerRate: 0.3,
        restauradorRate: 0.25,
        curadorRate: 0.15,
        detetiveRate: 0.4,
        persistenteRate: 0.6,
      },
      technical: {
        errorFreeSessionRate: 0.98,
      },
    };
  }
}
