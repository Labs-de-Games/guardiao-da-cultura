"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { checkBackendHealth } from "@/lib/api/health";
import { isMaintenanceActive } from "@/lib/api/maintenanceStatus";
import { nextRetryDelay } from "@/lib/errors/retryDelay";
import {
  GAME_MAINTENANCE_PATH,
  PLAYER_LANDING_PATH,
} from "@/lib/navigation/gameRoutes";
import {
  getCurrentPath,
  getSafeRedirectPath,
  navigateTo,
} from "@/lib/navigation/safeRedirect";

/** `scheduled`: maintenance flag on. `outage`: backend unreachable. */
export type MaintenanceReason = "scheduled" | "outage";
export type MaintenanceRecoveryStatus = "idle" | "checking" | "still_down";

function readNextParam(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("next");
}

function recoveryTarget(): string {
  const current = getCurrentPath();
  // Middleware rewrites keep the original URL, so reload it in that case.
  const fallback = current.startsWith(GAME_MAINTENANCE_PATH)
    ? PLAYER_LANDING_PATH
    : current;
  return getSafeRedirectPath(readNextParam(), fallback);
}

async function hasRecovered(reason: MaintenanceReason): Promise<boolean> {
  return reason === "scheduled"
    ? !(await isMaintenanceActive())
    : checkBackendHealth();
}

/**
 * Polls until the game is available again, then navigates back. Uses
 * backoff with jitter, pauses while the tab is hidden, and for outages
 * checks immediately so a direct visit while everything is fine returns home.
 */
export function useMaintenanceRecovery(reason: MaintenanceReason): {
  status: MaintenanceRecoveryStatus;
  retry: () => void;
} {
  const [status, setStatus] = useState<MaintenanceRecoveryStatus>("idle");
  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCheckingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runCheckRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback(() => {
    clearTimer();
    if (document.hidden) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runCheckRef.current();
    }, nextRetryDelay(attemptRef.current));
  }, [clearTimer]);

  const runCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    clearTimer();
    setStatus("checking");
    const recovered = await hasRecovered(reason);
    isCheckingRef.current = false;
    if (recovered) {
      navigateTo(recoveryTarget());
      return;
    }
    setStatus("still_down");
    attemptRef.current += 1;
    schedule();
  }, [reason, clearTimer, schedule]);

  runCheckRef.current = runCheck;

  useEffect(() => {
    if (reason === "outage") {
      void runCheck();
    } else {
      schedule();
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
      } else {
        void runCheck();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimer();
    };
  }, [reason, runCheck, schedule, clearTimer]);

  const retry = useCallback(() => {
    attemptRef.current = 0;
    void runCheck();
  }, [runCheck]);

  return { status, retry };
}
