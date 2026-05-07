import type { BadgeConfig } from "../game/types/BadgeTypes";
import { env } from "./env";

export type { BadgeConfig };

const API_URL = `${env.NEXT_PUBLIC_API_URL}/api/v1`;

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
  const res = await fetch(`${API_URL}/badges`);
  if (!res.ok) {
    throw new Error(`Failed to fetch badges: ${res.statusText}`);
  }

  const badges: ServerBadgeConfig[] = await res.json();
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

export async function unlockBadgeOnServer(
  userId: string,
  badgeId: string,
): Promise<boolean> {
  const res = await fetch(`${API_URL}/badges/unlock`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, badgeId }),
  });

  if (!res.ok) {
    throw new Error(`Failed to unlock badge: ${res.statusText}`);
  }

  return true;
}

export async function fetchUserBadges(
  userId: string,
): Promise<UserBadgeRecord[]> {
  const res = await fetch(`${API_URL}/badges/${userId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch user badges: ${res.statusText}`);
  }

  return res.json();
}
