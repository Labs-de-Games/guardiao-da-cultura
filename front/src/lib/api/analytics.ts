import { apiClient } from "./client";

export interface DashboardFunnelMetrics {
  loginCompletionRate: number;
  chapter1StartRate: number;
  chapter1CompletionRate: number;
}

export interface DashboardEngagementMetrics {
  averageSessionTime: number;
  totalPlayers: number;
}

export interface DashboardPedagogicalMetrics {
  quizSuccessRate: number;
  averageStarScore: number;
  objectInteractionRate: number;
}

export interface DashboardBadgeMetrics {
  explorerRate: number;
  restauradorRate: number;
  curadorRate: number;
  detetiveRate: number;
  persistenteRate: number;
}

export interface DashboardTechnicalMetrics {
  errorFreeSessionRate: number;
}

export interface DashboardMetrics {
  funnel: DashboardFunnelMetrics;
  engagement: DashboardEngagementMetrics;
  pedagogical: DashboardPedagogicalMetrics;
  badges: DashboardBadgeMetrics;
  technical: DashboardTechnicalMetrics;
}

export async function getDashboardMetrics(params?: {
  dateRange?: string;
}): Promise<DashboardMetrics> {
  const response = await apiClient.get<DashboardMetrics>("/metrics", {
    params,
  });
  return response.data;
}
