import type { Scene } from "phaser";
import { fetchBadges, unlockBadgeOnServer } from "../../lib/badgesApi";
import { GameEvents } from "../constants/GameEvents";
import type { BadgeCondition, BadgeConfig } from "../types/BadgeTypes";

/**
 * Strategy handlers for different comparison conditions.
 */
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

/**
 * BadgeSystem manages the detection and unlocking of achievements based on game statistics.
 */
export class BadgeSystem {
  private scene: Scene;
  private badges: BadgeConfig[] = [];
  private unlockedBadges: Set<string> = new Set();

  constructor(scene: Scene) {
    this.scene = scene;

    // Subscribe to registry changes
    this.scene.registry.events.on("changedata", this.onRegistryChange, this);
  }

  /**
   * Loads badges configuration and synchronizes initial state.
   */
  public async initialize() {
    try {
      this.badges = await fetchBadges();

      // Re-check existing registry values for all badge stats in case they were set before init
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

  /**
   * Validates if any badge requirements are met for a given statistic change.
   */
  public checkRequirements(statName: string, numericValue: number) {
    for (const badge of this.badges) {
      const isCorrectStat = badge.stat_required === statName;
      const isNotUnlocked = !this.unlockedBadges.has(badge.id);

      if (isCorrectStat && isNotUnlocked) {
        const handler = CONDITION_HANDLERS[badge.condition];

        if (handler && handler(numericValue, badge.goal_value)) {
          console.log(`[BadgeSystem] Condition met for: ${badge.id}`);
          this.unlockBadge(badge);
        }
      }
    }
  }

  private unlockBadge(badge: BadgeConfig) {
    this.unlockedBadges.add(badge.id);

    // Save to local storage for React Gallery persistence
    this.persistToLocalStorage(badge.id);

    // Emit event for Phaser visual feedback
    this.scene.events.emit(GameEvents.SHOW_BADGE_TOAST, badge);

    // Async sync with backend
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

      // Notify React components (e.g., BadgeGallery)
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
