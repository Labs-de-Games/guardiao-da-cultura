import type { Scene } from "phaser";
import posthog from "posthog-js";
import { sendGameEvent } from "../../lib/analyticsApi";
import {
  fetchBadges,
  fetchUserBadges,
  unlockBadgeOnServer,
} from "../../lib/badgesApi";
import { GameEvents } from "../constants/GameEvents";
import { GameEventType } from "../types/AnalyticsTypes";
import type { BadgeConfig } from "../types/BadgeTypes";

const CONDITION_HANDLERS: Record<
  string,
  (val: number, goal: number) => boolean
> = {
  ">=": (val, goal) => val >= goal,
  "<=": (val, goal) => val <= goal,
  "==": (val, goal) => val === goal,
  ">": (val, goal) => val > goal,
  "<": (val, goal) => val < goal,
};

export class BadgeSystem {
  private scene: Scene;
  private badges: BadgeConfig[] = [];
  private unlockedBadges: Set<string> = new Set();

  constructor(scene: Scene) {
    this.scene = scene;

    this.scene.registry.events.on("changedata", this.onRegistryChange, this);
  }

  public async initialize() {
    try {
      this.badges = await fetchBadges();

      try {
        const userBadges = await fetchUserBadges();
        userBadges.forEach((ub) => {
          this.unlockedBadges.add(ub.badgeId);
        });
      } catch (e) {
        console.warn(
          "[BadgeSystem] Could not sync unlocked badges from server",
          e,
        );
      }

      this.badges.forEach((badge) => {
        const currentValue = this.scene.registry.get(badge.stat_required);
        if (typeof currentValue === "number") {
          this.checkRequirements(badge.stat_required, currentValue);
        }
      });
    } catch (e) {
      console.error("[BadgeSystem] Error initializing badges", e);
    }
  }

  private onRegistryChange(_parent: unknown, key: string, value: unknown) {
    if (typeof value === "number") {
      this.checkRequirements(key, value);
    }
  }

  public checkRequirements(statName: string, numericValue: number) {
    for (const badge of this.badges) {
      const isCorrectStat = badge.stat_required === statName;
      const isNotUnlocked = !this.unlockedBadges.has(badge.id);

      if (isCorrectStat && isNotUnlocked) {
        const handler = CONDITION_HANDLERS[badge.condition];

        if (handler?.(numericValue, badge.goal_value)) {
          console.log(`[BadgeSystem] Condition met for: ${badge.id}`);
          this.unlockBadge(badge);
        }
      }
    }
  }

  private unlockBadge(badge: BadgeConfig) {
    this.unlockedBadges.add(badge.id);

    this.scene.events.emit(GameEvents.SHOW_BADGE_TOAST, badge);

    this.syncUnlockToServer(badge.id);
    const userId = this.scene.registry.get("userId");
    if (userId) {
      this.emitBadgeEarnedEvent(userId, badge);
      posthog.capture("badge_earned", {
        badge_id: badge.id,
        badge_name: badge.name,
        level_id: this.scene.registry.get("currentLevelId"),
      });
    }
  }

  private emitBadgeEarnedEvent(userId: string, badge: BadgeConfig) {
    const payload = {
      userId,
      type: GameEventType.BADGE_EARNED,
      timestamp: new Date().toISOString(),
      metadata: { badgeId: badge.id, badgeName: badge.name },
    };

    sendGameEvent(payload).catch((err) => {
      console.error("[BadgeSystem] Failed to send badge.earned event:", err);
    });
  }

  private async syncUnlockToServer(badgeId: string) {
    const isGuest = this.scene.registry.get("isGuest") === true;
    if (isGuest) {
      console.log(`[BadgeSystem] Skipping server sync for guest: ${badgeId}`);
      return;
    }
    try {
      await unlockBadgeOnServer(badgeId);
    } catch (err) {
      console.error(`[BadgeSystem] Failed to sync unlock for ${badgeId}`, err);
      this.retryUnlock(badgeId);
    }
  }

  private retryUnlock(badgeId: string, attempt = 1) {
    if (attempt > 3) return;

    setTimeout(() => {
      unlockBadgeOnServer(badgeId)
        .then(() =>
          console.log(
            `[BadgeSystem] Retry ${attempt} succeeded for ${badgeId}`,
          ),
        )
        .catch(() => this.retryUnlock(badgeId, attempt + 1));
    }, attempt * 1000);
  }

  public getUnlockedBadgeIds(): string[] {
    return Array.from(this.unlockedBadges);
  }

  public destroy() {
    this.scene.registry.events.off("changedata", this.onRegistryChange, this);
  }
}
