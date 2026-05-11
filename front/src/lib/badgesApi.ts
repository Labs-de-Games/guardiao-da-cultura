import type { BadgeConfig } from "../game/types/BadgeTypes";
import { apiClient } from "./api/client";

export type { BadgeConfig };

export interface ServerBadgeConfig {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  type: string;
  statRequired: string | null;
  condition: string;
  goalValue: number;
  createdAt: string;
}

export interface UserBadgeRecord {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
  badge: ServerBadgeConfig;
}

export async function fetchBadges(): Promise<BadgeConfig[]> {
  const res = await apiClient.get<ServerBadgeConfig[]>("/badges");
  const badges = res.data;

  return badges.map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    stat_required: b.statRequired ?? "",
    condition: b.condition,
    goal_value: b.goalValue,
    icon_key: b.iconUrl.split("/").pop()?.replace(".png", "") ?? b.id,
  }));
}

export async function unlockBadgeOnServer(badgeId: string): Promise<boolean> {
  await apiClient.post("/badges/unlock", { badgeId });
  return true;
}

export async function fetchUserBadges(): Promise<UserBadgeRecord[]> {
  const res = await apiClient.get<UserBadgeRecord[]>("/badges/me");
  return res.data;
}
