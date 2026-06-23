"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { setGuestId } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";
import { getOrCreateGuestSessionId } from "../lib/guestSession";
import { usePostHogDistinctId } from "../lib/posthog/FeatureFlagContext";
import { useEntryFlow } from "../lib/posthog/useEntryFlow";
import LoadingGameScreen from "./LoadingGameScreen";

const GameOverlay = dynamic(
  () =>
    import("@/ui/overlay/GameOverlay").then((m) => ({ default: m.default })),
  { ssr: false },
);

export default function PhaserGame() {
  const { user } = useAuth();
  const posthogDistinctId = usePostHogDistinctId();
  const { entryFlow, isLoading: isFlowLoading } = useEntryFlow();
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [_loadingType, setLoadingType] = useState<string>("initial");
  const [overlayMounted, setOverlayMounted] = useState(false);

  useEffect(() => {
    const handleLoadingStart = (event: Event) => {
      const customEvent = event as CustomEvent;
      setLoadingType(customEvent.detail?.type || "default");
      setIsLoading(true);
    };

    const handleLoadingComplete = () => {
      setIsLoading(false);
    };

    window.addEventListener("phaser-loading-start", handleLoadingStart);
    window.addEventListener("phaser-loading-complete", handleLoadingComplete);

    if (typeof window === "undefined" || !containerRef.current) return;
    if (isInitializingRef.current || gameRef.current) return;
    if (isFlowLoading) return;

    isInitializingRef.current = true;

    const initGame = async () => {
      try {
        const activeUserId = user?.id ?? null;
        const isGuest = !activeUserId;
        const guestSessionId = isGuest
          ? getOrCreateGuestSessionId(posthogDistinctId ?? null)
          : null;
        const playerId = activeUserId ?? guestSessionId;

        if (!playerId) {
          throw new Error("Player ID is required to start the game.");
        }

        if (isGuest && guestSessionId) {
          setGuestId(guestSessionId);
        }

        const { default: StartGame } = await import("../game/main");
        gameRef.current = StartGame(
          "game-container",
          playerId,
          isGuest,
          entryFlow,
        );
        setIsLoading(false);
        setOverlayMounted(true);
      } catch (err) {
        console.error("[PhaserGame] Error initializing game:", err);
        isInitializingRef.current = false;
        setIsLoading(false);
      }
    };

    void initGame();

    return () => {
      window.removeEventListener("phaser-loading-start", handleLoadingStart);
      window.removeEventListener(
        "phaser-loading-complete",
        handleLoadingComplete,
      );
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        isInitializingRef.current = false;
      }
    };
  }, [entryFlow, isFlowLoading, user?.id, posthogDistinctId]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {isLoading && <LoadingGameScreen />}
      {overlayMounted && <GameOverlay entryFlow={entryFlow} />}
    </div>
  );
}
