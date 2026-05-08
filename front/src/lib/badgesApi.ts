import type { BadgeConfig } from "../game/types/BadgeTypes";
import { MOCK_BADGES } from "./badges.mock";

export type { BadgeConfig };

/**
 * Reusable helper to simulate network latency.
 */
const simulateLatency = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches the available badges from the backend API.
 * Currently returns mocked data for frontend development.
 */
export async function fetchBadges(): Promise<BadgeConfig[]> {
  await simulateLatency(500);

  // In the future, this will be:
  // const res = await fetch(`${API_BASE_URL}/badges`);
  // return res.json();

  return MOCK_BADGES;
}

/**
 * Sends a request to the backend to unlock a badge for the current user.
 * Currently simulates a successful server response.
 */
export async function unlockBadgeOnServer(badgeId: string): Promise<boolean> {
  console.log(`[BadgesAPI Mock] Unlocking badge on server: ${badgeId}`);
  await simulateLatency(300);

  // In the future:
  // const res = await fetch(`${API_BASE_URL}/badges/unlock/${badgeId}...`, { method: 'POST' });
  // return res.ok;

  return true;
}
