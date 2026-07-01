"use client";

import { useEffect, useState } from "react";
import type { EntryFlow } from "@/game/main";
import { getGuestId } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { EventBus } from "@/shared/events/event-bus";
import { useDialogueBridge } from "@/ui/hooks/useDialogueBridge";
import { useEventBridge } from "@/ui/hooks/useEventBridge";
import { ScorePanel } from "@/ui/hud/ScorePanel";
import { Sidebar } from "@/ui/hud/Sidebar";
import { InterestDialog } from "@/ui/interest/InterestDialog";
import { IntroSequence } from "@/ui/intro/IntroSequence";
import BadgeGalleryPanel from "@/ui/panels/BadgeGalleryPanel";
import { ChunkSelectorPanel } from "@/ui/panels/ChunkSelectorPanel";
import { ControlsPanel } from "@/ui/panels/ControlsPanel";
import { DialoguePanel } from "@/ui/panels/DialoguePanel";
import { ErrorBoundary } from "@/ui/panels/ErrorBoundary";
import { LabelPanel } from "@/ui/panels/LabelPanel";
import { MapInfoBox } from "@/ui/panels/MapInfoBox";
import { ToastNotification } from "@/ui/panels/ToastNotification";
import QuizPanel from "@/ui/quiz/Quiz";
import { useDialogueStore } from "@/ui/state/dialogue-store";
import { UI_Z_INDEX, useGameUIStore } from "@/ui/state/game-ui-store";

export default function GameOverlay({
  entryFlow = "map",
}: {
  entryFlow?: EntryFlow;
}) {
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
        zIndex: UI_Z_INDEX.OVERLAY,
      }}
    >
      {mounted && <OverlayContent entryFlow={entryFlow} />}
    </div>
  );
}

function OverlayContent({ entryFlow }: { entryFlow: EntryFlow }) {
  const sidebarOpen = useGameUIStore((s) => s.sidebarOpen);
  const controlsOpen = useGameUIStore((s) => s.controlsOpen);
  const gameStarted = useGameUIStore((s) => s.gameStarted);
  const dialogueOpen = useDialogueStore((s) => s.dialogueOpen);
  const badgeGalleryOpen = useGameUIStore((s) => s.badgeGalleryOpen);
  const toggleSidebar = useGameUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useGameUIStore((s) => s.setSidebarOpen);
  const setControlsOpen = useGameUIStore((s) => s.setControlsOpen);
  const addToast = useGameUIStore((s) => s.addToast);
  const dequeueDialogue = useDialogueStore((s) => s.dequeueDialogue);
  const setLabelData = useGameUIStore((s) => s.setLabelData);
  const labelData = useGameUIStore((s) => s.labelData);
  const introData = useGameUIStore((s) => s.introData);
  const setIntroData = useGameUIStore((s) => s.setIntroData);

  useEventBridge({ entryFlow });
  const { emitComplete, emitDismiss } = useDialogueBridge();
  const setBadgeGalleryOpen = useGameUIStore((s) => s.setBadgeGalleryOpen);
  const addUnlockedBadge = useGameUIStore((s) => s.addUnlockedBadge);
  const setAuthState = useGameUIStore((s) => s.setAuthState);
  const openChunkSelector = useGameUIStore((s) => s.openChunkSelector);
  const chunkSelectorOpen = useGameUIStore((s) => s.chunkSelectorOpen);
  const _setGameStarted = useGameUIStore((s) => s.setGameStarted);
  const setActiveMapMarker = useGameUIStore((s) => s.setActiveMapMarker);
  const setAutoStartProgress = useGameUIStore((s) => s.setAutoStartProgress);

  const { isAuthenticated } = useAuth();
  useEffect(() => {
    const guestId = !isAuthenticated ? getGuestId() : null;
    setAuthState(isAuthenticated, guestId);
  }, [isAuthenticated, setAuthState]);

  useEffect(() => {
    if (gameStarted && !useGameUIStore.getState().sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [gameStarted, setSidebarOpen]);

  useEffect(() => {
    const unsubControls = EventBus.on("ui:controls-overlay", (data) => {
      setControlsOpen(data.open);
    });

    const unsubToast = EventBus.on("ui:toast-show", (data) => {
      addToast(data.message, data.duration, data.iconSrc);
    });

    const unsubLabelShow = EventBus.on("ui:label-show", (data) => {
      setLabelData(data);
    });

    const unsubIntroStart = EventBus.on("intro:start", (data) => {
      console.log("[DEBUG Flow] GameOverlay: received intro:start event", data);
      setIntroData(data);
    });

    const unsubBadgeGallery = EventBus.on("ui:badge-gallery-toggle", (data) => {
      setBadgeGalleryOpen(data.open);
    });

    const unsubBadgeUnlocked = EventBus.on("badge:unlocked", (data) => {
      addUnlockedBadge(data.badgeId);
    });

    const unsubChunkSelectorOpen = EventBus.on(
      "ui:chunk-selector-open",
      (data) => {
        openChunkSelector({
          instanceId: data.instanceId,
          availableItems: data.availableItems,
          filledSlots: data.filledSlots,
        });
      },
    );
    const unsubMapMarker = EventBus.on("map:marker-changed", (data) => {
      setActiveMapMarker(data);
      if (data && !data.isAvailable) {
        setAutoStartProgress(null);
      }
    });

    const unsubAutoStartTick = EventBus.on("map:auto-start-tick", (data) => {
      setAutoStartProgress(data.remainingMs / data.totalMs);
    });

    const unsubAutoStartCanceled = EventBus.on(
      "map:auto-start-canceled",
      () => {
        setAutoStartProgress(null);
      },
    );

    const unsubAutoStartCompleted = EventBus.on(
      "map:auto-start-completed",
      () => {
        setAutoStartProgress(null);
      },
    );

    return () => {
      unsubControls();
      unsubToast();
      unsubLabelShow();
      unsubIntroStart();
      unsubBadgeGallery();
      unsubBadgeUnlocked();
      unsubChunkSelectorOpen();
      unsubMapMarker();
      unsubAutoStartTick();
      unsubAutoStartCanceled();
      unsubAutoStartCompleted();
    };
  }, [
    setControlsOpen,
    addToast,
    setLabelData,
    setIntroData,
    setBadgeGalleryOpen,
    addUnlockedBadge,
    openChunkSelector,
    setActiveMapMarker,
    setAutoStartProgress,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (chunkSelectorOpen) {
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.key === "Tab") {
        if (gameStarted && !controlsOpen && !dialogueOpen) {
          e.preventDefault();
          toggleSidebar();
        }
      }
      if (e.key === "Escape") {
        if (labelData) {
          setLabelData(null);
          EventBus.emit("ui:label-hide", undefined);
        } else if (badgeGalleryOpen) {
          e.preventDefault();
          setBadgeGalleryOpen(false);
          return;
        } else if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
      if (e.key === "b" || e.key === "B") {
        if (gameStarted) {
          setBadgeGalleryOpen(!badgeGalleryOpen);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    labelData,
    sidebarOpen,
    controlsOpen,
    dialogueOpen,
    gameStarted,
    badgeGalleryOpen,
    toggleSidebar,
    setSidebarOpen,
    setLabelData,
    setBadgeGalleryOpen,
    chunkSelectorOpen,
  ]);

  useEffect(() => {
    if (!dialogueOpen && useDialogueStore.getState().dialogueQueue.length > 0) {
      EventBus.emit("dialogue:dequeue-started", undefined);
      dequeueDialogue();
    }
  }, [dialogueOpen, dequeueDialogue]);

  if (!gameStarted) {
    console.log(
      "[DEBUG Flow] GameOverlay: Rendering because gameStarted is false. introData present?",
      !!introData,
    );
    return (
      <>
        {introData && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: UI_Z_INDEX.OVERLAY + 1000,
              pointerEvents: "auto",
            }}
          >
            <IntroSequence
              config={introData.config}
              levelId={introData.levelId}
              onComplete={() => {
                console.log(
                  "[DEBUG Flow] GameOverlay: IntroSequence onComplete triggered, clearing introData",
                );
                setIntroData(null);
              }}
            />
          </div>
        )}
        <ToastNotification />
        <MapInfoBox />
      </>
    );
  }

  return (
    <>
      {introData && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: UI_Z_INDEX.OVERLAY + 1000,
            pointerEvents: "auto",
          }}
        >
          <IntroSequence
            config={introData.config}
            levelId={introData.levelId}
            onComplete={() => setIntroData(null)}
          />
        </div>
      )}
      <ScorePanel />
      <Sidebar />
      <ChunkSelectorPanel />
      <ToastNotification />
      <ErrorBoundary fallback={null}>
        <ControlsPanel />
      </ErrorBoundary>
      <DialoguePanel onComplete={emitComplete} onDismiss={emitDismiss} />
      <LabelPanel />
      <BadgeGalleryPanel />
      <QuizPanel />
      <InterestDialog />
    </>
  );
}
