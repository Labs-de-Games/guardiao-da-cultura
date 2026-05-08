import type { Scene } from "phaser";
import { fetchBadges, unlockBadgeOnServer } from "../../lib/badgesApi";
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
  private badges: BadgeConfig[] = [];
  private unlockedBadges: Set<string> = new Set();

  constructor(scene: Scene) {
    this.scene = scene;

    this.scene.registry.events.on("changedata", this.onRegistryChange, this);
  }

  public async initialize() {
    try {
      this.badges = await fetchBadges();

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

    this.persistToLocalStorage(badge.id);

    this.scene.events.emit(GameEvents.SHOW_BADGE_TOAST, badge);

    unlockBadgeOnServer(badge.id).catch((err) => {
      console.error(`[BadgeSystem] Failed to sync unlock for ${badge.id}`, err);
    });
  }

  private persistToLocalStorage(badgeId: string) {
    if (typeof window === "undefined") return;

    try {
      const storageKey = "unlocked_badges";
      const unlocked = JSON.parse(localStorage.getItem(storageKey) || "[]");

      if (!unlocked.includes(badgeId)) {
        unlocked.push(badgeId);
        localStorage.setItem(storageKey, JSON.stringify(unlocked));
      }

      window.dispatchEvent(
        new CustomEvent("badge-unlocked", { detail: badgeId }),
      );
    } catch (e) {
      console.error("[BadgeSystem] LocalStorage persistence error", e);
    }
  }

  public destroy() {
    this.scene.registry.events.off("changedata", this.onRegistryChange, this);
  }
}
