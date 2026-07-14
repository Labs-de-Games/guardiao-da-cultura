"use client";

import Image from "next/image";
import { useState } from "react";
import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export interface LoadingScreenProps {
  /** e.g. "level_03" — selects the matching regional background. Omit for a neutral screen. */
  levelId?: string;
  /** 0-100. Omit to show an indeterminate sweep animation. */
  progress?: number;
}

const SWEEP_KEYFRAMES = `
@keyframes loadingScreenSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
`;

export default function LoadingScreen({
  levelId,
  progress,
}: LoadingScreenProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const levelNumber = levelId?.match(/(\d+)$/)?.[1];
  const backgroundSrc =
    levelNumber && !imageFailed
      ? `/assets/data/levels/${levelId}/intro/loading_L${Number(levelNumber)}.png`
      : null;
  const clampedProgress =
    progress != null ? Math.min(100, Math.max(0, progress)) : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: LayoutConfig.COLORS.MAP_BG_CSS,
        overflow: "hidden",
      }}
    >
      {backgroundSrc && (
        <Image
          src={backgroundSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectFit: "cover", imageRendering: "pixelated" }}
          onError={() => setImageFailed(true)}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "17%",
          right: "17%",
          bottom: "10%",
          maxWidth: 974,
        }}
      >
        <div
          style={{
            color: GAME_UI_TOKENS.colors.accentGold,
            fontFamily: `${LayoutConfig.FONTS.TITLE}, sans-serif`,
            fontSize: LayoutConfig.FONTS.SIZES.TITLE_LARGE,
            marginBottom: 16,
          }}
          aria-live="polite"
          aria-busy="true"
        >
          Carregando...
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={clampedProgress ?? undefined}
          style={{
            width: "100%",
            height: 29,
            borderRadius: 999,
            backgroundColor: GAME_UI_TOKENS.colors.textPrimary,
            overflow: "hidden",
          }}
        >
          {clampedProgress != null ? (
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                backgroundColor: GAME_UI_TOKENS.colors.accentGold,
                width: `${clampedProgress}%`,
                transition: "width 200ms ease",
              }}
            />
          ) : (
            <div
              style={{
                height: "100%",
                width: "30%",
                borderRadius: 999,
                backgroundColor: GAME_UI_TOKENS.colors.accentGold,
                animation: "loadingScreenSweep 1.4s ease-in-out infinite",
              }}
            />
          )}
        </div>
      </div>

      {clampedProgress == null && <style>{SWEEP_KEYFRAMES}</style>}
    </div>
  );
}
