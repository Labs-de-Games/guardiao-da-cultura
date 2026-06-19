"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { setGuestId } from "../lib/api/client";
import { useAuth } from "../lib/auth/useAuth";
import { usePostHogDistinctId } from "../lib/posthog/FeatureFlagContext";
import LoadingGameScreen from "./LoadingGameScreen";

const GameOverlay = dynamic(
  () =>
    import("@/ui/overlay/GameOverlay").then((m) => ({ default: m.default })),
  { ssr: false },
);

interface PhaserGameProps {
  entryFlow?: "map" | "direct";
}

const FALLBACK_GUEST_ID_KEY = "gp_fallback_guest_id";

function getOrCreateFallbackGuestId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(FALLBACK_GUEST_ID_KEY);
  if (existing) return existing;

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `guest-${Date.now()}`;

  window.localStorage.setItem(FALLBACK_GUEST_ID_KEY, generated);
  return generated;
}

export default function PhaserGame(_props?: PhaserGameProps) {
  const { user } = useAuth();
  const posthogDistinctId = usePostHogDistinctId();
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

    isInitializingRef.current = true;

    const initGame = async () => {
      try {
        const activeUserId = user?.id;
        const isGuest = !activeUserId;
        const fallbackGuestId = isGuest ? getOrCreateFallbackGuestId() : "";
        const playerId = activeUserId ?? posthogDistinctId ?? fallbackGuestId;

        if (!playerId) {
          throw new Error("Player ID is required to start the game.");
        }

        if (isGuest) {
          setGuestId(posthogDistinctId ?? fallbackGuestId);
        }

        const { default: StartGame } = await import("../game/main");
        gameRef.current = StartGame("game-container", playerId, isGuest);
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
  }, [user?.id, posthogDistinctId]);

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
      {overlayMounted && <GameOverlay />}
    </div>
  );
}
