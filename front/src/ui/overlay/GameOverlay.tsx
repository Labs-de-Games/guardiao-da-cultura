"use client";

import { useEffect, useState } from "react";

import { EventBus } from "@/shared/events/event-bus";
import { Sidebar } from "@/ui/hud/Sidebar";
import { useGameUIStore } from "@/ui/state/game-ui-store";

export default function GameOverlay() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      id="game-overlay"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      {mounted && <OverlayContent />}
    </div>
  );
}

function OverlayContent() {
  const sidebarOpen = useGameUIStore((s) => s.sidebarOpen);
  const gameStarted = useGameUIStore((s) => s.gameStarted);
  const toggleSidebar = useGameUIStore((s) => s.toggleSidebar);
  const setStars = useGameUIStore((s) => s.setStars);
  const addOrUpdateMission = useGameUIStore((s) => s.addOrUpdateMission);
  const setCollectibles = useGameUIStore((s) => s.setCollectibles);
  const collectItem = useGameUIStore((s) => s.collectItem);
  const setSidebarOpen = useGameUIStore((s) => s.setSidebarOpen);
  const setGameStarted = useGameUIStore((s) => s.setGameStarted);

  useEffect(() => {
    const unsubStarted = EventBus.on("game:started", () => {
      setGameStarted(true);
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
        data.stepIndex,
        data.totalSteps,
        data.steps,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        if (gameStarted) {
          toggleSidebar();
        }
      }
      if (e.key === "Escape") {
        if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen, gameStarted, toggleSidebar, setSidebarOpen]);

  return <Sidebar />;
}
