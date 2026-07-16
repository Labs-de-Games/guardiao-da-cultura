"use client";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export interface LoadingIndicatorProps {
  /** Real load progress, 0-100. Only used for aria-valuenow; the bar itself cycles continuously. */
  progress?: number;
}

const CYCLE_KEYFRAMES = `
@keyframes loadingIndicatorCycle {
  0% { left: -30%; }
  100% { left: 100%; }
}
`;

/** Gradient + "Carregando..." label + progress bar shown over the per-level background in LoadingGameScreen. */
export function LoadingIndicator({ progress }: LoadingIndicatorProps) {
  const clampedProgress =
    progress != null ? Math.min(100, Math.max(0, progress)) : undefined;

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, transparent 45%, rgba(0,0,0,0.88) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "17%",
          right: "17%",
          bottom: "10%",
          maxWidth: 974,
          pointerEvents: "none",
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
          aria-valuenow={clampedProgress}
          style={{
            position: "relative",
            width: "100%",
            height: 29,
            borderRadius: 999,
            backgroundColor: GAME_UI_TOKENS.colors.textPrimary,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              height: "100%",
              width: "30%",
              borderRadius: 999,
              backgroundColor: GAME_UI_TOKENS.colors.accentGold,
              animation: "loadingIndicatorCycle 1.6s linear infinite",
            }}
          />
        </div>
      </div>

      <style>{CYCLE_KEYFRAMES}</style>
    </>
  );
}
