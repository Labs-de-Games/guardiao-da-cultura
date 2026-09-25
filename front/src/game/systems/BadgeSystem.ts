import type { Scene } from "phaser";
import posthog from "posthog-js";
import type { GamePersistence } from "@/lib/persistence/gamePersistence";
import { getEventContext } from "../../lib/posthog/eventContext";
import { EventBus } from "../../shared/events/event-bus";
import { GameEvents } from "../constants/GameEvents";
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
  private persistence: GamePersistence;
  private badges: BadgeConfig[] = [];
  private unlockedBadges: Set<string> = new Set();

  constructor(scene: Scene, persistence: GamePersistence) {
    this.scene = scene;
    this.persistence = persistence;
  }

  public async initialize() {
    try {
      this.badges = await this.persistence.getBadgeCatalog();

      try {
        const unlockedIds = await this.persistence.getUnlockedBadgeIds();
        unlockedIds.forEach((id) => {
          this.unlockedBadges.add(id);
        });
      } catch (e) {
        console.warn("[BadgeSystem] Could not sync unlocked badges", e);
      }

      this.badges.forEach((badge) => {
        const currentValue = this.scene.registry.get(badge.stat_required);
        if (typeof currentValue === "number") {
          this.checkRequirements(badge.stat_required, currentValue);
        }
      });

      this.scene.registry.events.on("changedata", this.onRegistryChange, this);
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
    EventBus.emit("badge:unlocked", {
      badgeId: badge.id,
      badgeName: badge.name,
      iconKey: badge.icon_key,
    });

    void this.syncUnlockToPersistence(badge.id);

    void this.persistence.sendBadgeEarnedEvent({
      badgeId: badge.id,
      badgeName: badge.name,
    });

    posthog.capture("badge_earned", {
      badge_id: badge.id,
      badge_name: badge.name,
      level_id: this.scene.registry.get("currentLevelId"),
      is_guest: this.persistence.mode === "guest",
      // Issue #741's dual-emit table ("+ chapter_id"). before_send also
      // backstops this from the same singleton, but set explicitly here
      // too so it's true at the call site, not just after the network
      // boundary.
      chapter_id: getEventContext().chapterId,
    });
  }

  private async syncUnlockToPersistence(badgeId: string) {
    try {
      await this.persistence.unlockBadge(badgeId);
      if (this.persistence.mode === "guest") {
        console.log(
          `[BadgeSystem] Saved badge to localStorage for guest: ${badgeId}`,
        );
      }
    } catch (err) {
      console.error(`[BadgeSystem] Failed to sync unlock for ${badgeId}`, err);
      if (this.persistence.mode === "auth") {
        this.retryUnlock(badgeId);
      }
    }
  }

  private retryUnlock(badgeId: string, attempt = 1) {
    if (attempt > 3) return;

    setTimeout(() => {
      this.persistence
        .unlockBadge(badgeId)
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
