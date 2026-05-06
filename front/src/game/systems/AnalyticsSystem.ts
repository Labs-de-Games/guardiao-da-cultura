import type { Scene } from "phaser";
import { sendGameEvent } from "../../lib/analyticsApi";
import { type GameEventPayload, GameEventType } from "../types/AnalyticsTypes";

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

    console.log(`[AnalyticsSystem] Tracking event: ${type}`, payload);

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

  public setupAbandonmentTracking() {
    if (typeof window === "undefined") return;

    window.addEventListener("beforeunload", () => {
      const levelId = this.scene.registry.get("currentLevelId");
      if (levelId) {
        this.trackLevelEvent(GameEventType.LEVEL_FAILED, levelId, {
          reason: "abandoned",
        });
      }

      this.track(GameEventType.SESSION_END, {
        reason: "browser_close",
        lastScene: this.scene.scene.key,
      });
    });
  }
}
