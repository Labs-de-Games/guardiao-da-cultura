"use client";

import { useEffect } from "react";

import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";

export function useEventBridge() {
  const setGameStarted = useGameUIStore((s) => s.setGameStarted);
  const setSidebarOpen = useGameUIStore((s) => s.setSidebarOpen);
  const setStars = useGameUIStore((s) => s.setStars);
  const addOrUpdateMission = useGameUIStore((s) => s.addOrUpdateMission);
  const setCollectibles = useGameUIStore((s) => s.setCollectibles);
  const collectItem = useGameUIStore((s) => s.collectItem);

  useEffect(() => {
    const unsubStarted = EventBus.on("game:started", () => {
      setGameStarted(true);
    });

    const unsubEnded = EventBus.on("game:ended", () => {
      setGameStarted(false);
      setSidebarOpen(false);
    });

    const unsubSidebar = EventBus.on("sidebar:toggled", (data) => {
      setSidebarOpen(data.open);
    });

    const unsubStars = EventBus.on("player:stars-changed", (data) => {
      setStars(data.current, data.total);
    });

    const unsubQuestProgress = EventBus.on("quest:progress-changed", (data) => {
      addOrUpdateMission(
        data.missionId,
        data.missionTitle,
        data.collectedInfos,
        data.totalSteps,
        data.steps,
        data.stepProgress,
      );
    });

    const unsubCollectSync = EventBus.on(
      "inventory:collectibles-sync",
      (data) => {
        setCollectibles(data.entries);
      },
    );

    const unsubCollectItem = EventBus.on("inventory:item-collected", (data) => {
      collectItem(data.itemId);
    });

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
    setSidebarOpen,
    setStars,
    addOrUpdateMission,
    setCollectibles,
    collectItem,
    setGameStarted,
  ]);
}
