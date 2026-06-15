"use client";

import { useEffect, useState } from "react";
import { getGuestId } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/useAuth";
import { EventBus } from "@/shared/events/event-bus";
import { useDialogueBridge } from "@/ui/hooks/useDialogueBridge";
import { useEventBridge } from "@/ui/hooks/useEventBridge";
import { Sidebar } from "@/ui/hud/Sidebar";
import { ControlsPanel } from "@/ui/panels/ControlsPanel";
import { DialoguePanel } from "@/ui/panels/DialoguePanel";
import { ErrorBoundary } from "@/ui/panels/ErrorBoundary";
import { LabelPanel } from "@/ui/panels/LabelPanel";
import { ToastNotification } from "@/ui/panels/ToastNotification";
import { useDialogueStore } from "@/ui/state/dialogue-store";
import { UI_Z_INDEX, useGameUIStore } from "@/ui/state/game-ui-store";
import BadgeGalleryPanel from "@/ui/panels/BadgeGalleryPanel";

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
        zIndex: UI_Z_INDEX.OVERLAY,
      }}
    >
      {mounted && <OverlayContent />}
    </div>
  );
}

function OverlayContent() {
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

  useEventBridge();
  const { emitComplete, emitDismiss } = useDialogueBridge();
  const setGameStarted = useGameUIStore((s) => s.setGameStarted);
  const setBadgeGalleryOpen = useGameUIStore((s) => s.setBadgeGalleryOpen);
  const addUnlockedBadge = useGameUIStore((s) => s.addUnlockedBadge);
  const setAuthState = useGameUIStore((s) => s.setAuthState);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const guestId = !isAuthenticated ? getGuestId() : null;
    setAuthState(isAuthenticated, guestId);
  }, [isAuthenticated, setAuthState]);

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

    const unsubBadgeGallery = EventBus.on("ui:badge-gallery-toggle", (data) => {
      setBadgeGalleryOpen(data.open);
    });

    const unsubBadgeUnlocked = EventBus.on("badge:unlocked", (data) => {
      addUnlockedBadge(data.badgeId);
    });

    return () => {
      unsubControls();
      unsubToast();
      unsubLabelShow();
      unsubBadgeGallery();
      unsubBadgeUnlocked();
    };
  }, [setControlsOpen, addToast, setLabelData, setBadgeGalleryOpen, addUnlockedBadge]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  ]);

  useEffect(() => {
    if (!dialogueOpen && useDialogueStore.getState().dialogueQueue.length > 0) {
      EventBus.emit("dialogue:dequeue-started", undefined);
      dequeueDialogue();
    }
  }, [dialogueOpen, dequeueDialogue]);

  if (!gameStarted) return null;

  return (
    <>
      <Sidebar />
      <ToastNotification />
      <ErrorBoundary fallback={null}>
        <ControlsPanel />
      </ErrorBoundary>
      <DialoguePanel onComplete={emitComplete} onDismiss={emitDismiss} />
      <LabelPanel />
      <BadgeGalleryPanel />
    </>
  );
}
