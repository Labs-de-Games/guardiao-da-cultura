import type { Scene } from "phaser";
import posthog from "posthog-js";
import { sendGameEvent } from "../../lib/analyticsApi";
import { type GameEventPayload, GameEventType } from "../types/AnalyticsTypes";

const SESSION_FINISHED_SENT_KEY = "gp_session_finished_sent";

/**
 * Module-level, not per-instance: `LevelCinematic.ts` restarts the GAME
 * scene per level, and a new `AnalyticsSystem` is constructed on every
 * `create()`. Before this guard, `setupAbandonmentTracking()` ran (and
 * attached a `beforeunload` listener) once per level, and the listener was
 * never removed — so listeners accumulated and SESSION_END fired once per
 * level, not once per session.
 */
let abandonmentTrackingInstalled = false;

/** Test-only: resets the module-level installation guard between tests. */
export function __resetAbandonmentTrackingForTests(): void {
  abandonmentTrackingInstalled = false;
}

export class AnalyticsSystem {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public track(type: GameEventType, metadata?: Record<string, unknown>) {
    const userId = this.scene.registry.get("userId");

    const payload: GameEventPayload = {
      userId,
      type,
      timestamp: new Date().toISOString(),
      metadata: metadata ?? {},
    };

    sendGameEvent(payload).catch((err) => {
      console.error(`[AnalyticsSystem] Failed to send event ${type}:`, err);
    });
  }

  public trackLevelEvent(
    type:
      | GameEventType.LEVEL_STARTED
      | GameEventType.LEVEL_COMPLETED
      | GameEventType.LEVEL_FAILED,
    levelId: string,
    metadata?: Record<string, unknown>,
  ) {
    this.track(type, {
      levelId,
      ...metadata,
    });
  }

  /**
   * Installs at most once per browser session (module guard above), and
   * the canonical `session_finished` capture inside it is itself
   * single-fire (sessionStorage guard) regardless of which of the three
   * triggers — `pagehide`, `visibilitychange`, or `beforeunload` — fires
   * first. `beforeunload` alone is unreliable on iOS Safari, which is why
   * all three are wired; see discovery §5.2/§7.
   *
   * Deliberately does NOT hook Phaser's scene SHUTDOWN event (see
   * Game.ts's SESSION_END capture) — SHUTDOWN fires on every level
   * transition, which is exactly the per-level inflation this method
   * exists to avoid for the canonical event.
   */
  public setupAbandonmentTracking() {
    if (typeof window === "undefined") return;
    if (abandonmentTrackingInstalled) return;
    abandonmentTrackingInstalled = true;

    const enteredAt = Date.now();
    let sent = false;

    const finish = (reason: string) => {
      if (sent) return;
      if (
        typeof sessionStorage !== "undefined" &&
        sessionStorage.getItem(SESSION_FINISHED_SENT_KEY)
      ) {
        return;
      }
      sent = true;
      sessionStorage?.setItem(SESSION_FINISHED_SENT_KEY, "1");

      let levelId: string | undefined;
      try {
        levelId = this.scene.registry.get("currentLevelId");
      } catch {
        // Registry can be unavailable if the owning scene was already
        // destroyed by the time this fires — non-fatal, just omit it.
      }

      // transport: "sendBeacon" per issue #741 — a regular fetch/XHR can
      // be cancelled mid-flight when the tab is actually closing, which is
      // exactly when this fires (pagehide/beforeunload/hidden).
      posthog.capture(
        "session_finished",
        {
          reason,
          duration_seconds: Math.round((Date.now() - enteredAt) / 1000),
          last_level_id: levelId,
        },
        { transport: "sendBeacon" },
      );

      this.track(GameEventType.SESSION_END, { reason, lastLevelId: levelId });
    };

    window.addEventListener("beforeunload", () => finish("browser_close"));
    window.addEventListener("pagehide", () => finish("pagehide"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") finish("visibilitychange");
    });
  }
}
