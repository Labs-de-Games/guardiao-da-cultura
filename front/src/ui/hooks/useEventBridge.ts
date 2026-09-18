"use client";

import { useEffect } from "react";

import type { EntryFlow } from "@/game/main";
import { EventBus } from "@/shared/events/event-bus";
import type { GameEventMap } from "@/shared/events/game-events";
import { useGameUIStore } from "@/ui/state/game-ui-store";

export function useEventBridge({
  entryFlow = "map",
  isEntryFlowLoading = false,
}: {
  entryFlow?: EntryFlow;
  isEntryFlowLoading?: boolean;
} = {}) {
  const startGame = useGameUIStore((s) => s.startGame);
  const endGame = useGameUIStore((s) => s.endGame);
  const setSidebarOpen = useGameUIStore((s) => s.setSidebarOpen);
  const setStars = useGameUIStore((s) => s.setStars);
  const setScore = useGameUIStore((s) => s.setScore);
  const addOrUpdateMission = useGameUIStore((s) => s.addOrUpdateMission);
  const setCollectibles = useGameUIStore((s) => s.setCollectibles);
  const collectItem = useGameUIStore((s) => s.collectItem);
  const setProgression = useGameUIStore((s) => s.setProgression);
  const setEvidenceBoardOpen = useGameUIStore((s) => s.setEvidenceBoardOpen);
  const setEvidenceBoardSelectedClueId = useGameUIStore(
    (s) => s.setEvidenceBoardSelectedClueId,
  );
  const openInvestigation = useGameUIStore((s) => s.openInvestigation);

  useEffect(() => {
    const currentStatus = useGameUIStore.getState().gameStarted;
    if (!currentStatus && !isEntryFlowLoading && entryFlow === "direct") {
      startGame();
    }

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
        return () => {};
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
      setScore(data.score);
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
      "collectible:collectibles-sync",
      (data) => {
        setCollectibles(data.entries);
      },
    );

    const unsubCollectItem = safeSubscribe(
      "collectible:item-collected",
      (data) => {
        collectItem(data.itemId);
      },
    );

    const unsubProgression = safeSubscribe("progression:updated", (data) => {
      setProgression(data);
    });

    const unsubEvidenceBoardClue = safeSubscribe(
      "ui:evidence-board-open-with-clue",
      (data) => {
        setEvidenceBoardSelectedClueId(data.clueId);
        setEvidenceBoardOpen(true);
      },
    );

    const unsubInvestigationStart = safeSubscribe(
      "investigation:start",
      (data) => {
        openInvestigation(data);
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
      unsubProgression();
      unsubEvidenceBoardClue();
      unsubInvestigationStart();
    };
  }, [
    entryFlow,
    isEntryFlowLoading,
    startGame,
    endGame,
    setSidebarOpen,
    setStars,
    setScore,
    addOrUpdateMission,
    setCollectibles,
    collectItem,
    setProgression,
    setEvidenceBoardOpen,
    setEvidenceBoardSelectedClueId,
    openInvestigation,
  ]);
}
