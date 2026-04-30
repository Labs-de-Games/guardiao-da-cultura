import type { Scene } from "phaser";
import {
  type BadgeConfig,
  fetchBadges,
  unlockBadgeOnServer,
} from "../../lib/badgesApi";
import { GameEvents } from "../constants/GameEvents";

export class BadgeSystem {
  private scene: Scene;
  private badges: BadgeConfig[] = [];
  private unlockedBadges: Set<string> = new Set();

  constructor(scene: Scene) {
    this.scene = scene;

    // Subscribe to registry changes
    this.scene.registry.events.on("changedata", this.onRegistryChange, this);
  }

  public async initialize() {
    try {
      this.badges = await fetchBadges();
    } catch (e) {
      console.error("[BadgeSystem] Error fetching badges", e);
    }
  }

  private onRegistryChange(_parent: unknown, key: string, value: unknown) {
    console.log(`[BadgeSystem] Registry changed: ${key} = ${value}`);
    this.checkRequirements(key, value);
  }

  private checkRequirements(statName: string, value: unknown) {
    const numericValue = typeof value === "number" ? value : 0;
    console.log(`[BadgeSystem] Checking stat: ${statName} = ${numericValue}`);
    for (const badge of this.badges) {
      if (
        badge.stat_required === statName &&
        !this.unlockedBadges.has(badge.id)
      ) {
        console.log(
          `[BadgeSystem] Found matching badge: ${badge.id}, goal: ${badge.goal_value}, condition: ${badge.condition}`,
        );
        let conditionMet = false;

        switch (badge.condition) {
          case ">=":
            conditionMet = numericValue >= badge.goal_value;
            break;
          case "<=":
            conditionMet = numericValue <= badge.goal_value;
            break;
          case "==":
            conditionMet = numericValue === badge.goal_value;
            break;
          case ">":
            conditionMet = numericValue > badge.goal_value;
            break;
          case "<":
            conditionMet = numericValue < badge.goal_value;
            break;
        }

        if (conditionMet) {
          console.log(
            `[BadgeSystem] Condition met! Unlocking badge: ${badge.id}`,
          );
          this.unlockBadge(badge);
        } else {
          console.log(`[BadgeSystem] Condition NOT met for badge: ${badge.id}`);
        }
      }
    }
  }

  private unlockBadge(badge: BadgeConfig) {
    this.unlockedBadges.add(badge.id);

    // Save to local storage for React Gallery
    if (typeof window !== "undefined") {
      const unlocked = JSON.parse(
        localStorage.getItem("unlocked_badges") || "[]",
      );
      if (!unlocked.includes(badge.id)) {
        unlocked.push(badge.id);
        localStorage.setItem("unlocked_badges", JSON.stringify(unlocked));
      }
      // Notify React component
      window.dispatchEvent(
        new CustomEvent("badge-unlocked", { detail: badge.id }),
      );
    }

    // Emit event to show visual feedback
    this.scene.events.emit(GameEvents.SHOW_BADGE_TOAST, badge);

    // Save to backend
    unlockBadgeOnServer(badge.id).catch((err) => {
      console.error(`[BadgeSystem] Failed to sync unlock for ${badge.id}`, err);
    });
  }

  public destroy() {
    this.scene.registry.events.off("changedata", this.onRegistryChange, this);
  }
}
