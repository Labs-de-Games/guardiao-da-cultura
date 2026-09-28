import type { GameEventPayload } from "../game/types/AnalyticsTypes";
import { apiClient } from "./api/client";
import { hasAnalyticsConsent } from "./consent/consentStorage";
import { env } from "./env";

const API_URL = env.client.apiUrl;

function getApiUrl(path: string): string {
  if (API_URL) {
    return `${API_URL}${path}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}

/**
 * Post a gameplay event to our own Postgres pipeline (`POST /api/v1/events`).
 *
 * Gated on consent (issue #864), the same as PostHog. This is the single
 * choke point for every caller, so the game code that emits events needs no
 * changes — mirroring how deferring `posthog.init()` covers its call sites.
 *
 * Progress persistence is deliberately NOT gated: `/scores` and
 * `/progression` hold the player's own saved game, which is a feature for
 * them rather than analytics about them — "recursos necessários para o jogo
 * funcionar", in the banner's words.
 */
export async function sendGameEvent(
  payload: GameEventPayload,
): Promise<boolean> {
  if (!hasAnalyticsConsent()) return false;

  const url = getApiUrl("/api/v1/events");

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
