"use client";

import { useEffect, useRef, useState } from "react";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { UI_Z_INDEX, useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const ANIMATION_DURATION_MS = 400;

export function formatScore(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function ScorePanel() {
  const targetScore = useGameUIStore((s) => s.score);
  const [displayScore, setDisplayScore] = useState(0);
  const prevScoreRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevScoreRef.current === targetScore) return;

    const from = prevScoreRef.current;
    const to = targetScore;
    const startTime = performance.now();

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = Math.round(from + (to - from) * eased);

      setDisplayScore(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        prevScoreRef.current = to;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [targetScore]);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: UI_Z_INDEX.PANEL,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: LayoutConfig.COLORS.MAP_BG,
        borderRadius: GAME_UI_TOKENS.radius.small,
        padding: "12px 20px",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.25)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: GAME_UI_TOKENS.colors.textPrimary,
          lineHeight: 1,
        }}
      >
        Pontuação:
      </span>
      <span
        style={{
          fontFamily: "Inter, sans-serif",
          fontSize: 20,
          fontWeight: 700,
          color: GAME_UI_TOKENS.colors.accentGold,
          lineHeight: 1,
        }}
      >
        {formatScore(displayScore)}
      </span>
    </div>
  );
}
