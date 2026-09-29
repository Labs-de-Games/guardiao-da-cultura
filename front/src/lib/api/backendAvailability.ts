import axios, { type AxiosError } from "axios";
import {
  GAME_MAINTENANCE_PATH,
  isGameRoute,
} from "@/lib/navigation/gameRoutes";
import { getCurrentPath, navigateTo } from "@/lib/navigation/safeRedirect";
import { checkBackendHealth } from "./health";

const UNAVAILABLE_STATUSES = new Set([502, 503, 504]);

let pendingCheck: Promise<void> | null = null;

export function isBackendUnavailableError(error: AxiosError): boolean {
  if (axios.isCancel(error)) return false;
  const status = error.response?.status;
  if (status === undefined) return true;
  return UNAVAILABLE_STATUSES.has(status);
}

/**
 * A single failed request is not enough to declare an outage, so this
 * confirms with the health endpoint before sending the user to the
 * maintenance page. Concurrent failures share one check.
 */
export function handleBackendUnavailable(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  const { pathname } = window.location;
  // Only game pages have a maintenance screen; elsewhere the error passes
  // through to the caller as before.
  if (!isGameRoute(pathname) || pathname === GAME_MAINTENANCE_PATH) {
    return Promise.resolve();
  }
  // The player's own connection dropped: not an outage. OfflineNotice tells
  // them instead of sending them to the maintenance page.
  if (!navigator.onLine) return Promise.resolve();
  if (pendingCheck) return pendingCheck;

  pendingCheck = checkBackendHealth()
    .then((healthy) => {
      if (healthy) return;
      const next = encodeURIComponent(getCurrentPath());
      navigateTo(`${GAME_MAINTENANCE_PATH}?next=${next}`);
    })
    .finally(() => {
      pendingCheck = null;
    });

  return pendingCheck;
}
