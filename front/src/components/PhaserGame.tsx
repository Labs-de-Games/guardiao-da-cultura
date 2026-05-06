"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentUserId } from "../lib/session";

export default function PhaserGame() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    // DEBUG: exposed for debugging purposes only
    getCurrentUserId().catch((err) => console.error("[debug init erro]", err));

    // Dynamically import game code only on client side
    const initGame = async () => {
      const { default: StartGame } = await import("../game/main");
      gameRef.current = StartGame("game-container");
      setIsLoading(false);
    };

    void initGame();

    // Cleanup on unmount
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
          Loading game...
        </div>
      )}
    </div>
  );
}
