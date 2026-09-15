"use client";

import { useCallback } from "react";
import { EventBus } from "@/shared/events/event-bus";
import type { GeniusColor } from "@/shared/events/game-events";

/**
 * Hook for playing UI sounds from React components.
 * Emits events that are handled by the Phaser game scene.
 */
export function useSound() {
  const playClick = useCallback(() => {
    EventBus.emit("ui:sound-click", undefined);
  }, []);

  const playHover = useCallback(() => {
    EventBus.emit("ui:sound-hover", undefined);
  }, []);

  const playModalOpen = useCallback(() => {
    EventBus.emit("ui:sound-modal-open", undefined);
  }, []);

  const playModalClose = useCallback(() => {
    EventBus.emit("ui:sound-modal-close", undefined);
  }, []);

  const playBadgeUnlock = useCallback(() => {
    EventBus.emit("ui:sound-badge-unlock", undefined);
  }, []);

  const playLevelComplete = useCallback(() => {
    EventBus.emit("ui:sound-level-complete", undefined);
  }, []);

  const playGeniusNote = useCallback((color: GeniusColor) => {
    EventBus.emit("ui:sound-genius-note", { color });
  }, []);

  return {
    playClick,
    playHover,
    playModalOpen,
    playModalClose,
    playBadgeUnlock,
    playLevelComplete,
    playGeniusNote,
  };
}
