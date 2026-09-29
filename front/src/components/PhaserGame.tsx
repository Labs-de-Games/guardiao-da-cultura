"use client";

import dynamic from "next/dynamic";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import { LayoutConfig } from "../game/constants/LayoutConfig";
import { GameEventType } from "../game/types/AnalyticsTypes";
import { sendGameEvent } from "../lib/analyticsApi";
import { setGuestId } from "../lib/api/client";
import { AudioAccessibilityService } from "../lib/audio";
import { reportErrorPage } from "../lib/errors/reportError";
import { getOrCreateGuestSessionId } from "../lib/guestSession";
import { EventBus } from "../shared/events/event-bus";
import { GameLoadErrorScreen } from "./errors/ErrorPages";
import LoadingGameScreen from "./LoadingGameScreen";
import LoadingScreen from "./LoadingScreen";

const GameOverlay = dynamic(
  () =>
    import("@/ui/overlay/GameOverlay").then((m) => ({ default: m.default })),
  { ssr: false },
);

// Keeps LoadingGameScreen visible for at least this long so it doesn't
// flash by unread when assets load from cache.
const MIN_LEVEL_LOADING_MS = 5000;

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasViewportCleanupRef = useRef<(() => void) | null>(null);
  const isInitializingRef = useRef(false);
  const resumeAudioRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLevelId, setLoadingLevelId] = useState<string | undefined>();
  const [loadingProgress, setLoadingProgress] = useState<number | undefined>();
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [hasInitError, setHasInitError] = useState(false);
  const [initAttempt, setInitAttempt] = useState(0);
  const loadingStartedAtRef = useRef<number | null>(null);
  const currentLevelIdRef = useRef<string | undefined>(undefined);
  const minLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const gameLoadSuccessSentRef = useRef(false);
  const gameLoadFailedSentRef = useRef(false);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const handleLoadingStart = (event: Event) => {
      const customEvent = event as CustomEvent<{
        type?: string;
        levelId?: string;
      }>;
      if (minLoadingTimeoutRef.current) {
        clearTimeout(minLoadingTimeoutRef.current);
        minLoadingTimeoutRef.current = null;
      }
      gameLoadSuccessSentRef.current = false;
      loadingStartedAtRef.current = Date.now();
      currentLevelIdRef.current = customEvent.detail?.levelId;
      setLoadingLevelId(customEvent.detail?.levelId);
      setLoadingProgress(undefined);
      setIsLoading(true);
    };

    const handleLoadingProgress = (event: Event) => {
      const customEvent = event as CustomEvent<{ progress: number }>;
      setLoadingProgress(customEvent.detail?.progress);
    };

    const handleLoadingComplete = () => {
      const elapsed = loadingStartedAtRef.current
        ? Date.now() - loadingStartedAtRef.current
        : MIN_LEVEL_LOADING_MS;

      if (!gameLoadSuccessSentRef.current) {
        gameLoadSuccessSentRef.current = true;
        posthog.capture("game_load_success", {
          level_id: currentLevelIdRef.current,
          loading_time_ms: elapsed,
        });
      }

      const remaining = Math.max(0, MIN_LEVEL_LOADING_MS - elapsed);

      if (remaining === 0) {
        setIsLoading(false);
        return;
      }

      minLoadingTimeoutRef.current = setTimeout(() => {
        minLoadingTimeoutRef.current = null;
        setIsLoading(false);
      }, remaining);
    };

    // Previously a no-op: Game.ts's `loaderror` handler (scenes/Game.ts)
    // dispatched this DOM event straight into nothing, so asset-load
    // failures during actual gameplay (not just module import/init, which
    // game_load_failed above already covers) were captured nowhere.
    const handleLoadingError = (event: Event) => {
      const customEvent = event as CustomEvent<{
        stage?: string;
        key?: string;
      }>;
      const errorCode = "asset_load_failed";
      const metadata = {
        error_code: errorCode,
        is_blocking: true,
        loading_stage: customEvent.detail?.stage,
        asset_key: customEvent.detail?.key,
        level_id: currentLevelIdRef.current,
      };

      posthog.capture("critical_error_occurred", metadata);

      // Also mirrored into game_event (severity: "critical") via the
      // existing generic EVENT_LOGGED type — no new enum value needed —
      // so #748's "keep the legacy dashboard as a fallback" promise has
      // something to show. Closes the same pendency tracked in
      // docs/pt-BR/notes/EPIC-analytics-dashboard.md ("emit event.logged for critical
      // errors").
      sendGameEvent({
        userId: playerIdRef.current ?? undefined,
        type: GameEventType.EVENT_LOGGED,
        timestamp: new Date().toISOString(),
        metadata: { severity: "critical", ...metadata },
      }).catch((err) => {
        console.error(
          "[PhaserGame] Failed to log critical_error_occurred:",
          err,
        );
      });
      reportErrorPage("asset_load", undefined, {
        stage: customEvent.detail?.stage,
        asset_key: customEvent.detail?.key,
        level_id: currentLevelIdRef.current,
      });
    };

    if (typeof window === "undefined" || !containerRef.current) return;
    if (isInitializingRef.current || gameRef.current) return;

    // Registered only once all early-return guards above have passed, and
    // always paired with the cleanup below in the same effect run. Adding
    // these before the guards (as before) meant every early-bail re-render
    // (e.g. one where the game was already initializing) leaked a duplicate
    // listener set with no matching cleanup — each real phaser-loading-error
    // would then fire handleLoadingError once per leaked listener,
    // multiplying critical_error_occurred captures and game_event writes.
    window.addEventListener("phaser-loading-start", handleLoadingStart);
    window.addEventListener("phaser-loading-progress", handleLoadingProgress);
    window.addEventListener("phaser-loading-complete", handleLoadingComplete);
    window.addEventListener("phaser-loading-error", handleLoadingError);

    isInitializingRef.current = true;

    const initGame = async () => {
      let stage: "player_id_resolution" | "module_import" | "phaser_init" =
        "player_id_resolution";
      try {
        // Players never authenticate (#738: no player login/registration)
        // — always a guest, identified by the persisted guest session id.
        const guestSessionId = getOrCreateGuestSessionId();
        const playerId = guestSessionId;

        if (!playerId) {
          throw new Error("Player ID is required to start the game.");
        }
        playerIdRef.current = playerId;

        if (guestSessionId) {
          setGuestId(guestSessionId);
        }

        stage = "module_import";
        const { default: StartGame } = await import("../game/main");

        stage = "phaser_init";
        const game = StartGame("game-container", playerId, true);
        gameRef.current = game;

        const emitCanvasViewport = () => {
          const canvas = game.canvas;
          const container = containerRef.current;
          if (!canvas || !container) return;
          const canvasRect = canvas.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          EventBus.emit("canvas:viewport-changed", {
            left: canvasRect.left - containerRect.left,
            top: canvasRect.top - containerRect.top,
            width: canvasRect.width,
            height: canvasRect.height,
            scaleX: canvasRect.width / LayoutConfig.GAME.WIDTH,
            scaleY: canvasRect.height / LayoutConfig.GAME.HEIGHT,
          });
        };
        emitCanvasViewport();
        requestAnimationFrame(emitCanvasViewport);
        game.scale.on("resize", emitCanvasViewport);
        window.addEventListener("resize", emitCanvasViewport);
        canvasViewportCleanupRef.current = () => {
          game.scale.off("resize", emitCanvasViewport);
          window.removeEventListener("resize", emitCanvasViewport);
        };

        // Pass Phaser's sound manager for TTS volume ducking
        AudioAccessibilityService.setSoundManager(game.sound);

        // Resume AudioContext after first user gesture (Chrome autoplay policy)
        const resumeAudio = () => {
          const soundManager = game.sound as Phaser.Sound.WebAudioSoundManager;
          if (soundManager?.context?.state === "suspended") {
            soundManager.context.resume();
          }
          document.removeEventListener("click", resumeAudio);
          document.removeEventListener("keydown", resumeAudio);
        };
        document.addEventListener("click", resumeAudio);
        document.addEventListener("keydown", resumeAudio);
        resumeAudioRef.current = resumeAudio;

        setIsLoading(false);
        setOverlayMounted(true);
      } catch (err) {
        if (!gameLoadFailedSentRef.current) {
          gameLoadFailedSentRef.current = true;
          posthog.capture("game_load_failed", {
            error_message: err instanceof Error ? err.message : String(err),
            error_type: err instanceof Error ? err.name : "unknown",
            loading_stage: stage,
          });

          // Issue #741's first critical_error_occurred hook: a boot
          // failure means the player can't reach chapter_1_completed
          // without reloading — always blocking.
          const criticalMetadata = {
            error_code: `game_boot_failed:${stage}`,
            is_blocking: true,
            loading_stage: stage,
          };
          posthog.capture("critical_error_occurred", criticalMetadata);
          sendGameEvent({
            userId: playerIdRef.current ?? undefined,
            type: GameEventType.EVENT_LOGGED,
            timestamp: new Date().toISOString(),
            metadata: { severity: "critical", ...criticalMetadata },
          }).catch((mirrorErr) => {
            console.error(
              "[PhaserGame] Failed to log critical_error_occurred:",
              mirrorErr,
            );
          });
        }
        console.error("[PhaserGame] Error initializing game:", err);
        isInitializingRef.current = false;
        setIsLoading(false);
        setHasInitError(true);
      }
    };

    void initGame();

    return () => {
      if (resumeAudioRef.current) {
        document.removeEventListener("click", resumeAudioRef.current);
        document.removeEventListener("keydown", resumeAudioRef.current);
        resumeAudioRef.current = null;
      }
      window.removeEventListener("phaser-loading-start", handleLoadingStart);
      window.removeEventListener(
        "phaser-loading-progress",
        handleLoadingProgress,
      );
      window.removeEventListener(
        "phaser-loading-complete",
        handleLoadingComplete,
      );
      window.removeEventListener("phaser-loading-error", handleLoadingError);
      if (minLoadingTimeoutRef.current) {
        clearTimeout(minLoadingTimeoutRef.current);
        minLoadingTimeoutRef.current = null;
      }
      if (canvasViewportCleanupRef.current) {
        canvasViewportCleanupRef.current();
        canvasViewportCleanupRef.current = null;
      }
      if (gameRef.current) {
        gameRef.current.destroy(false);
        gameRef.current = null;
        isInitializingRef.current = false;
        gameLoadFailedSentRef.current = false;
      }
    };
    // posthogDistinctId deliberately excluded (#740): it transitions from
    // null to a real value once the async bootstrap fetch resolves,
    // causing a second, spurious run of this effect. It has been dead as
    // an input to getOrCreateGuestSessionId since this same issue made
    // player identity a synchronous, middleware-set durable cookie —
    // getOrCreateGuestSessionId already prefers the existing persisted
    // guest id over any argument.
    // initAttempt only triggers a clean re-init after an init failure.
  }, [initAttempt]);

  const handleRetryInit = () => {
    gameLoadFailedSentRef.current = false;
    setHasInitError(false);
    setIsLoading(true);
    setInitAttempt((attempt) => attempt + 1);
  };

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#000000",
      }}
    >
      {hasInitError && <GameLoadErrorScreen onRetry={handleRetryInit} />}
      {isLoading &&
        (loadingLevelId ? (
          <LoadingGameScreen
            levelId={loadingLevelId}
            progress={loadingProgress}
          />
        ) : (
          <LoadingScreen />
        ))}
      {overlayMounted && <GameOverlay />}
    </div>
  );
}
