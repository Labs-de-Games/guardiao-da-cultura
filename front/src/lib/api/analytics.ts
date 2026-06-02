import { apiClient } from "./client";

export interface RecentActivity {
  id: string;
  nickname: string;
  action: string;
  detail: string;
  timestamp: Date;
}

export interface StudentWithDifficulty {
  nickname: string;
  levelName: string;
  attempts: number;
  status: "failed" | "struggling";
}

export interface AggregatedMetrics {
  totalStudents: number;
  activeStudents: number;
  averageCompletionRate: number;
  totalStarsCollected: number;
  averageQuizAccuracy: number;
  recentActivity: RecentActivity[];
  studentsWithDifficulty: StudentWithDifficulty[];
}

export interface ClassMetrics {
  id: string;
  name: string;
  studentsCount: number;
  completionRate: number;
  averageStars: number;
}

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

export async function getAggregatedMetrics(): Promise<AggregatedMetrics> {
  const response = await apiClient.get<AggregatedMetrics>(
    "/analytics/aggregated",
  );
  return response.data;
}

export async function getClassesMetrics(): Promise<ClassMetrics[]> {
  const response = await apiClient.get<ClassMetrics[]>("/analytics/classes");
  return response.data;
}

export async function getDashboardMetrics(params?: {
  dateRange?: string;
}): Promise<DashboardMetrics> {
  const response = await apiClient.get<DashboardMetrics>("/dashboard/metrics", {
    params,
  });
  return response.data;
}
