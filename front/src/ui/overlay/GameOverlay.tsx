"use client";

import { useCallback, useEffect, useRef } from "react";
import { getGuestId } from "@/lib/api/client";
import { EventBus } from "@/shared/events/event-bus";
import { CreditsScreen } from "@/ui/credits/CreditsScreen";
import { useDialogueBridge } from "@/ui/hooks/useDialogueBridge";
import { useEventBridge } from "@/ui/hooks/useEventBridge";
import {
  STAGE_EXIT_CALLBACK_ID,
  useRequestStageExit,
} from "@/ui/hooks/useStageExit";
import { ScorePanel } from "@/ui/hud/ScorePanel";
import { Sidebar } from "@/ui/hud/Sidebar";
import { InterestDialog } from "@/ui/interest/InterestDialog";
import { IntroSequence } from "@/ui/intro/IntroSequence";
import { InvestigationScreen } from "@/ui/investigation/InvestigationScreen";
import BadgeGalleryPanel from "@/ui/panels/BadgeGalleryPanel";
import { BandSelectorPanel } from "@/ui/panels/BandSelectorPanel";
import { ChunkSelectorPanel } from "@/ui/panels/ChunkSelectorPanel";
import { ConfirmationPanel } from "@/ui/panels/ConfirmationPanel";
import { ControlsPanel } from "@/ui/panels/ControlsPanel";
import { CostumeSelectorPanel } from "@/ui/panels/CostumeSelectorPanel";
import { CreditsButton } from "@/ui/panels/CreditsButton";
import { DialoguePanel } from "@/ui/panels/DialoguePanel";
import { ErrorBoundary } from "@/ui/panels/ErrorBoundary";
import { GeniusSequencePanel } from "@/ui/panels/GeniusSequencePanel";
import { LabelPanel } from "@/ui/panels/LabelPanel";
import { MapInfoBox } from "@/ui/panels/MapInfoBox";
import { MapPinTooltip } from "@/ui/panels/MapPinTooltip";
import { PrivacySettings } from "@/ui/panels/PrivacySettings";
import { StepSequencePanel } from "@/ui/panels/StepSequencePanel";
import { ToastNotification } from "@/ui/panels/ToastNotification";
import QuizPanel from "@/ui/quiz/Quiz";
import { useDialogueStore } from "@/ui/state/dialogue-store";
import { UI_Z_INDEX, useGameUIStore } from "@/ui/state/game-ui-store";
import { EvidenceBoardOverlay } from "./EvidenceBoardOverlay";

export default function GameOverlay() {
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
      <OverlayContent />
    </div>
  );
}

function OverlayContent() {
  const controlsOpen = useGameUIStore((s) => s.controlsOpen);
  const gameStarted = useGameUIStore((s) => s.gameStarted);
  const levelTransitionActive = useGameUIStore((s) => s.levelTransitionActive);
  const dialogueOpen = useDialogueStore((s) => s.dialogueOpen);
  const dialogueMode = useDialogueStore((s) => s.dialogueMode);
  const dialogueCallbackId = useDialogueStore((s) => s.dialogueCallbackId);
  const requestStageExit = useRequestStageExit();
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

  useEventBridge();
  const { emitComplete, emitDismiss } = useDialogueBridge();
  const setBadgeGalleryOpen = useGameUIStore((s) => s.setBadgeGalleryOpen);
  const addUnlockedBadge = useGameUIStore((s) => s.addUnlockedBadge);
  const setAuthState = useGameUIStore((s) => s.setAuthState);
  const openChunkSelector = useGameUIStore((s) => s.openChunkSelector);
  const chunkSelectorOpen = useGameUIStore((s) => s.chunkSelectorOpen);
  const openCostumeSelector = useGameUIStore((s) => s.openCostumeSelector);
  const costumeSelectorOpen = useGameUIStore((s) => s.costumeSelectorOpen);
  const openStepSequence = useGameUIStore((s) => s.openStepSequence);
  const stepSequenceOpen = useGameUIStore((s) => s.stepSequenceOpen);
  const openBandPanel = useGameUIStore((s) => s.openBandPanel);
  const openGeniusSequence = useGameUIStore((s) => s.openGeniusSequence);
  const geniusSequenceOpen = useGameUIStore((s) => s.geniusSequenceOpen);
  const evidenceBoardOpen = useGameUIStore((s) => s.evidenceBoardOpen);
  const setEvidenceBoardOpen = useGameUIStore((s) => s.setEvidenceBoardOpen);
  const creditsOpen = useGameUIStore((s) => s.creditsOpen);
  const setCreditsOpen = useGameUIStore((s) => s.setCreditsOpen);
  const investigationOpen = useGameUIStore((s) => s.investigation.open);
  const quizVisible = useGameUIStore((s) => s.quiz.isVisible);
  const isInterestDialogOpen = useGameUIStore((s) => s.isInterestDialogOpen);
  const _setGameStarted = useGameUIStore((s) => s.setGameStarted);
  const setActiveMapMarker = useGameUIStore((s) => s.setActiveMapMarker);
  const setAutoStartProgress = useGameUIStore((s) => s.setAutoStartProgress);

  // Players never authenticate (#738: no player login/registration) — the
  // game is always played as a guest, identified by getGuestId().
  useEffect(() => {
    setAuthState(false, getGuestId());
  }, [setAuthState]);

  /**
   * The auto-start progress describes a Phaser timer, but it is stored in a
   * module-level store that outlives any route change. Leaving the game (for
   * `/privacidade`, say) destroys the timer while leaving its last value
   * behind, so the map would come back showing a countdown already part-way
   * through — one no live timer is driving. Clearing it on unmount keeps the
   * displayed countdown tied to the timer that actually exists.
   */
  useEffect(() => {
    return () => useGameUIStore.getState().setAutoStartProgress(null);
  }, []);

  // Armed at level start so that dismissing the initial ControlsPanel also
  // collapses the sidebar; consumed on the first close, then Tab-only again.
  const levelStartControlsRef = useRef(false);
  const prevControlsOpenRef = useRef(controlsOpen);

  useEffect(() => {
    levelStartControlsRef.current = gameStarted;
    if (gameStarted && !useGameUIStore.getState().sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [gameStarted, setSidebarOpen]);

  useEffect(() => {
    const wasOpen = prevControlsOpenRef.current;
    prevControlsOpenRef.current = controlsOpen;
    if (wasOpen && !controlsOpen && levelStartControlsRef.current) {
      levelStartControlsRef.current = false;
      setSidebarOpen(false);
    }
  }, [controlsOpen, setSidebarOpen]);

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
          expectedSlots: data.expectedSlots,
        });
      },
    );

    const unsubStepSequenceOpen = EventBus.on(
      "ui:step-sequence-open",
      (data) => {
        openStepSequence(data);
      },
    );

    const unsubGeniusSequenceOpen = EventBus.on(
      "ui:genius-sequence-open",
      (data) => {
        openGeniusSequence(data);
      },
    );

    const unsubCostumeSelectorOpen = EventBus.on(
      "ui:costume-selector-open",
      (data) => {
        openCostumeSelector({
          instanceId: data.instanceId,
          correctCostume: data.correctCostume,
          equippedParts: data.equippedParts,
          lockedParts: data.lockedParts,
        });
      },
    );

    const unsubBandPanelOpen = EventBus.on("ui:band-panel-open", (data) => {
      openBandPanel(data);
    });

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

    const unsubCreditsOpen = EventBus.on("credits:open", () => {
      setCreditsOpen(true);
    });

    const unsubCreditsClose = EventBus.on("credits:close", () => {
      setCreditsOpen(false);
    });

    return () => {
      unsubControls();
      unsubToast();
      unsubLabelShow();
      unsubIntroStart();
      unsubBadgeGallery();
      unsubBadgeUnlocked();
      unsubChunkSelectorOpen();
      unsubCostumeSelectorOpen();
      unsubStepSequenceOpen();
      unsubBandPanelOpen();
      unsubGeniusSequenceOpen();
      unsubMapMarker();
      unsubAutoStartTick();
      unsubAutoStartCanceled();
      unsubAutoStartCompleted();
      unsubCreditsOpen();
      unsubCreditsClose();
    };
  }, [
    setControlsOpen,
    addToast,
    setLabelData,
    setIntroData,
    setBadgeGalleryOpen,
    addUnlockedBadge,
    openChunkSelector,
    openCostumeSelector,
    openStepSequence,
    openBandPanel,
    openGeniusSequence,
    setActiveMapMarker,
    setAutoStartProgress,
    setCreditsOpen,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        introData ||
        chunkSelectorOpen ||
        costumeSelectorOpen ||
        stepSequenceOpen ||
        geniusSequenceOpen
      ) {
        // IntroSequence owns the screen (and Escape) while a cinematic is
        // playing — it has its own skip handler. gameStarted is already true
        // by then, so without this bail-out the stage-exit branch below would
        // fire on the same Escape press.
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
        if (evidenceBoardOpen) {
          e.preventDefault();
          setEvidenceBoardOpen(false);
          return;
        }
        if (labelData) {
          setLabelData(null);
          EventBus.emit("ui:label-hide", undefined);
        } else if (badgeGalleryOpen) {
          e.preventDefault();
          setBadgeGalleryOpen(false);
          return;
        } else if (
          gameStarted &&
          !dialogueOpen &&
          !controlsOpen &&
          !quizVisible &&
          !isInterestDialogOpen
        ) {
          // Sidebar no longer closes on Escape (TAB and the sidebar's own
          // pull-tab are its only toggles now) — Escape always opens the
          // stage-exit prompt instead.
          e.preventDefault();
          requestStageExit();
        }
      }
      if ((e.key === " " || e.key === "e" || e.key === "E") && labelData) {
        e.preventDefault();
        e.stopPropagation();
        setLabelData(null);
        EventBus.emit("ui:label-hide", undefined);
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
    introData,
    labelData,
    controlsOpen,
    dialogueOpen,
    gameStarted,
    badgeGalleryOpen,
    toggleSidebar,
    setLabelData,
    setBadgeGalleryOpen,
    chunkSelectorOpen,
    costumeSelectorOpen,
    stepSequenceOpen,
    geniusSequenceOpen,
    evidenceBoardOpen,
    setEvidenceBoardOpen,
    quizVisible,
    isInterestDialogOpen,
    requestStageExit,
  ]);

  useEffect(() => {
    if (!dialogueOpen && useDialogueStore.getState().dialogueQueue.length > 0) {
      EventBus.emit("dialogue:dequeue-started", undefined);
      dequeueDialogue();
    }
  }, [dialogueOpen, dequeueDialogue]);

  const isStageExitConfirmOpen =
    dialogueOpen &&
    dialogueMode === "confirmation" &&
    dialogueCallbackId === STAGE_EXIT_CALLBACK_ID;

  // Phaser scene ops (pause/resume/stop/start) are all queued and only
  // applied together on the next frame — they are NOT synchronous. On
  // confirm, UIScene's "stage:exit-confirmed" handler queues a resume(UI) +
  // stop(GAME); a generic "game:resume-requested" firing after that (from
  // this effect's cleanup, which runs asynchronously once React commits)
  // would queue an extra resume(GAME) behind the stop. Phaser's
  // Systems.resume() only checks the scene isn't currently active — true
  // for an already-shut-down scene too — so that resume revives GAME into
  // RUNNING with its camera already torn down, crashing on the next
  // update(). This ref lets the confirm path suppress that resume-request.
  const stageExitConfirmedRef = useRef(false);

  useEffect(() => {
    if (!isStageExitConfirmOpen) return;
    // Freezes the world (movement, tweens, timers) while the player decides
    // — mirrors the selector panels (e.g. ChunkSelectorPanel), which pause
    // GAME+UI the same way while open.
    EventBus.emit("game:pause-requested", { reason: "stage-exit-confirm" });
    return () => {
      if (!stageExitConfirmedRef.current) {
        EventBus.emit("game:resume-requested", {
          reason: "stage-exit-confirm",
        });
      }
      stageExitConfirmedRef.current = false;
    };
  }, [isStageExitConfirmOpen]);

  const handleConfirmationComplete = useCallback(
    (callbackId: string, confirmed?: boolean) => {
      if (callbackId === STAGE_EXIT_CALLBACK_ID) {
        if (confirmed) {
          stageExitConfirmedRef.current = true;
          EventBus.emit("stage:exit-confirmed", undefined);
        }
        return;
      }
      emitComplete(callbackId, confirmed);
    },
    [emitComplete],
  );

  const handleConfirmationDismiss = useCallback(
    (callbackId: string) => {
      if (callbackId === STAGE_EXIT_CALLBACK_ID) return;
      emitDismiss(callbackId);
    },
    [emitDismiss],
  );

  if (introData) {
    return (
      <>
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
              setIntroData(null);
            }}
          />
        </div>
      </>
    );
  }

  if (creditsOpen) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: UI_Z_INDEX.OVERLAY + 1000,
          pointerEvents: "auto",
        }}
      >
        <CreditsScreen
          onClose={() => {
            setCreditsOpen(false);
            // Announced, not just applied: the investigation's ending waits on
            // this to know the crawl is done and the map should come back.
            EventBus.emit("credits:close", undefined);
          }}
        />
      </div>
    );
  }

  if (investigationOpen) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: UI_Z_INDEX.OVERLAY + 1000,
          pointerEvents: "auto",
        }}
      >
        <InvestigationScreen />
      </div>
    );
  }

  if (levelTransitionActive && !gameStarted) {
    // Level hand-off in flight: Phaser and LoadingGameScreen own the screen.
    return null;
  }

  if (!gameStarted) {
    return (
      <>
        <MapPinTooltip />
        <MapInfoBox />
        <CreditsButton />
        <PrivacySettings />
      </>
    );
  }

  return (
    <>
      <ScorePanel />
      <Sidebar />
      <ChunkSelectorPanel />
      <CostumeSelectorPanel />
      <StepSequencePanel />
      <BandSelectorPanel />
      <GeniusSequencePanel />
      <ToastNotification />
      <ErrorBoundary fallback={null}>
        <ControlsPanel />
      </ErrorBoundary>
      <DialoguePanel onComplete={emitComplete} onDismiss={emitDismiss} />
      {dialogueOpen && dialogueMode === "confirmation" && (
        <ConfirmationPanel
          onComplete={handleConfirmationComplete}
          onDismiss={handleConfirmationDismiss}
        />
      )}
      <LabelPanel />
      <BadgeGalleryPanel />
      <QuizPanel />
      <EvidenceBoardOverlay />
      <InterestDialog />
    </>
  );
}
