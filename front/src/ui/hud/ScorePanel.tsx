"use client";

import { useEffect, useRef, useState } from "react";

import { useGameUIStore } from "@/ui/state/game-ui-store";

const ANIMATION_DURATION_MS = 400;

function formatScore(value: number): string {
  return value.toLocaleString("pt-BR");
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
        zIndex: 30,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "#252726",
        borderRadius: 8,
        padding: "12px 20px",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.25)",
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: "Inter",
          fontSize: 20,
          fontWeight: 700,
          color: "#F5F5F5",
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
          color: "#D9AD56",
          lineHeight: 1,
        }}
      >
        {formatScore(displayScore)}
      </span>
    </div>
  );
}
