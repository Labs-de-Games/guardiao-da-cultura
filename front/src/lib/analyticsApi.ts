import type { GameEventPayload } from "../game/types/AnalyticsTypes";
import { apiClient } from "./api/client";
import { env } from "./env";

const API_URL = env.NEXT_PUBLIC_API_URL;

export async function sendGameEvent(
  payload: GameEventPayload,
): Promise<boolean> {
  const url = `${API_URL}/api/v1/events`;

  if (
    payload.type === "session.end" &&
    typeof navigator !== "undefined" &&
    navigator.sendBeacon
  ) {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    return navigator.sendBeacon(url, blob);
  }

  try {
    await apiClient.post("/events", payload);
    return true;
  } catch (error) {
    console.error(`[AnalyticsAPI] Error sending event ${payload.type}:`, error);
    return false;
  }
}
