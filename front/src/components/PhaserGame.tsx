"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth/useAuth";

export default function PhaserGame() {
  const { user } = useAuth();
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;
    if (isInitializingRef.current || gameRef.current) return;

    isInitializingRef.current = true;

    const initGame = async () => {
      try {
        const activeUserId = user?.id;
        if (!activeUserId) {
          throw new Error("User ID is required to start the game.");
        }

        const { default: StartGame } = await import("../game/main");
        gameRef.current = StartGame("game-container", activeUserId);
        setIsLoading(false);
      } catch (err) {
        console.error("[PhaserGame] Error initializing game:", err);
        isInitializingRef.current = false;
      }
    };

    void initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        isInitializingRef.current = false;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="game-container"
      style={{
        width: "100%",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {isLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "white",
            backgroundColor: "#000000",
          }}
        >
          Carregando o jogo...
        </div>
      )}
    </div>
  );
}
