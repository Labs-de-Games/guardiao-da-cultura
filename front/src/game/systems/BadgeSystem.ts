import type { Scene } from "phaser";
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

      const userId = this.scene.registry.get("userId");
      if (userId) {
        try {
          const userBadges = await fetchUserBadges(userId);
          userBadges.forEach((ub) => {
            this.unlockedBadges.add(ub.badgeId);
          });
        } catch (e) {
          console.warn(
            "[BadgeSystem] Could not sync unlocked badges from server",
            e,
          );
        }
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

    const userId = this.scene.registry.get("userId");
    if (userId) {
      this.syncUnlockToServer(userId, badge.id);
      this.emitBadgeEarnedEvent(userId, badge);
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

  private async syncUnlockToServer(userId: string, badgeId: string) {
    try {
      await unlockBadgeOnServer(userId, badgeId);
    } catch (err) {
      console.error(`[BadgeSystem] Failed to sync unlock for ${badgeId}`, err);
      this.retryUnlock(userId, badgeId);
    }
  }

  private retryUnlock(userId: string, badgeId: string, attempt = 1) {
    if (attempt > 3) return;

    setTimeout(() => {
      unlockBadgeOnServer(userId, badgeId)
        .then(() =>
          console.log(
            `[BadgeSystem] Retry ${attempt} succeeded for ${badgeId}`,
          ),
        )
        .catch(() => this.retryUnlock(userId, badgeId, attempt + 1));
    }, attempt * 1000);
  }

  public getUnlockedBadgeIds(): string[] {
    return Array.from(this.unlockedBadges);
  }

  public destroy() {
    this.scene.registry.events.off("changedata", this.onRegistryChange, this);
  }
}
