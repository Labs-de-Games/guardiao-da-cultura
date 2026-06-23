"use client";

import { useEffect } from "react";

import type { EntryFlow } from "@/game/main";
import { EventBus } from "@/shared/events/event-bus";
import type { GameEventMap } from "@/shared/events/game-events";
import { useGameUIStore } from "@/ui/state/game-ui-store";

/**
 * Hook: useEventBridge
 *
 * This hook synchronizes Phaser game events with the React/Zustand UI state.
 * It listens to events emitted from the Phaser engine via the EventBus and maps
 * them to Zustand store actions.
 *
 * Key features:
 * - Checks entry flow ("direct" vs "map") and controls initial game start state.
 * - Wraps event subscription in safe catch blocks to prevent system crashes if the emitter fails.
 * - Centralizes game state changes through abstracted store actions (startGame, endGame).
 */
export function useEventBridge({
  entryFlow = "map",
}: {
  entryFlow?: EntryFlow;
} = {}) {
  const startGame = useGameUIStore((s) => s.startGame);
  const endGame = useGameUIStore((s) => s.endGame);
  const setSidebarOpen = useGameUIStore((s) => s.setSidebarOpen);
  const setStars = useGameUIStore((s) => s.setStars);
  const addOrUpdateMission = useGameUIStore((s) => s.addOrUpdateMission);
  const setCollectibles = useGameUIStore((s) => s.setCollectibles);
  const collectItem = useGameUIStore((s) => s.collectItem);

  useEffect(() => {
    // If entering directly, start the game immediately. Otherwise wait for 'game:started' event.
    const currentStatus = useGameUIStore.getState().gameStarted;
    if (!currentStatus && entryFlow === "direct") {
      startGame();
    }

    // Defensive subscription wrapper to catch any registration or execution errors
    const safeSubscribe = <K extends keyof GameEventMap>(
      event: K,
      fn: (data: GameEventMap[K]) => void,
    ) => {
      try {
        return EventBus.on(event, fn);
      } catch (error) {
        console.error(
          `[EventBridge] Falha ao assinar evento '${event}'`,
          error,
        );
        return () => {}; // Graceful no-op cleanup
      }
    };

    const unsubStarted = safeSubscribe("game:started", () => {
      startGame();
    });

    const unsubEnded = safeSubscribe("game:ended", () => {
      endGame();
    });

    const unsubSidebar = safeSubscribe("sidebar:toggled", (data) => {
      setSidebarOpen(data.open);
    });

    const unsubStars = safeSubscribe("player:stars-changed", (data) => {
      setStars(data.current, data.total);
    });

    const unsubQuestProgress = safeSubscribe(
      "quest:progress-changed",
      (data) => {
        addOrUpdateMission(
          data.missionId,
          data.missionTitle,
          data.collectedInfos,
          data.totalSteps,
          data.steps,
          data.stepProgress,
        );
      },
    );

    const unsubCollectSync = safeSubscribe(
      "inventory:collectibles-sync",
      (data) => {
        setCollectibles(data.entries);
      },
    );

    const unsubCollectItem = safeSubscribe(
      "inventory:item-collected",
      (data) => {
        collectItem(data.itemId);
      },
    );

    return () => {
      unsubStarted();
      unsubEnded();
      unsubSidebar();
      unsubStars();
      unsubQuestProgress();
      unsubCollectSync();
      unsubCollectItem();
    };
  }, [
    entryFlow,
    startGame,
    endGame,
    setSidebarOpen,
    setStars,
    addOrUpdateMission,
    setCollectibles,
    collectItem,
  ]);
}
