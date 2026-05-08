import type { GameEventPayload } from "../game/types/AnalyticsTypes";
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
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[AnalyticsAPI] Failed to send event ${payload.type}:`,
        response.statusText,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[AnalyticsAPI] Error sending event ${payload.type}:`, error);
    return false;
  }
}
