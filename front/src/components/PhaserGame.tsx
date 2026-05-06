"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUserId } from "../lib/session";

export default function PhaserGame({ userId }: { userId?: string }) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const initGame = async () => {
      try {
        let activeUserId = userId;
        if (!activeUserId) {
          activeUserId = await getCurrentUserId();
        }

        const { default: StartGame } = await import("../game/main");
        gameRef.current = StartGame("game-container", activeUserId);
        setIsLoading(false);
      } catch (err) {
        console.error("[PhaserGame] Error initializing game:", err);
      }
    };

    void initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
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
