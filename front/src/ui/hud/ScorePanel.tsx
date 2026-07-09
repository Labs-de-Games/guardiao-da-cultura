"use client";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { UI_Z_INDEX, useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const NODE_SPACING_PX = 44;
const MIN_BAR_WIDTH_PX = 120;
const BAR_HEIGHT_PX = 32;
const TRACK_HEIGHT_PX = 3;
const DOT_SIZE_PX = 8;
const STAR_FONT_SIZE_PX = 40;
const POP_TRANSITION =
  "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s";

export function ScorePanel() {
  const stars = useGameUIStore((s) => s.stars);
  const totalStars = useGameUIStore((s) => s.totalStars);

  if (totalStars <= 0) return null;

  const barWidth = Math.max(MIN_BAR_WIDTH_PX, totalStars * NODE_SPACING_PX);
  const fillPct = Math.min(100, (stars / totalStars) * 100);
  const nodes = Array.from({ length: Math.floor(totalStars) }, (_, i) => i + 1);

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        zIndex: UI_Z_INDEX.PANEL,
        display: "flex",
        alignItems: "center",
        background: LayoutConfig.COLORS.MAP_BG_CSS,
        borderRadius: GAME_UI_TOKENS.radius.small,
        padding: "12px 20px",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.25)",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          position: "relative",
          height: BAR_HEIGHT_PX,
          width: barWidth,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: TRACK_HEIGHT_PX,
            background: "rgba(255, 255, 255, 0.15)",
            transform: "translateY(-50%)",
            borderRadius: TRACK_HEIGHT_PX,
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: `${fillPct}%`,
            height: TRACK_HEIGHT_PX,
            background: GAME_UI_TOKENS.colors.accentGold,
            transform: "translateY(-50%)",
            borderRadius: TRACK_HEIGHT_PX,
            transition: "width 0.2s ease",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            width: DOT_SIZE_PX,
            height: DOT_SIZE_PX,
            borderRadius: "50%",
            background:
              stars > 0
                ? GAME_UI_TOKENS.colors.accentGold
                : GAME_UI_TOKENS.colors.textSecondary,
            transform: "translate(-50%, -50%)",
            transition: "background-color 0.2s",
          }}
        />

        {nodes.map((node) => {
          const isCompleted = node <= stars;
          return (
            <div
              key={node}
              style={{
                position: "absolute",
                top: "50%",
                left: `${(node / totalStars) * 100}%`,
                transform: `translate(-50%, -50%) scale(${
                  isCompleted ? 1 : 0.85
                })`,
                fontSize: STAR_FONT_SIZE_PX,
                lineHeight: 1,
                color: isCompleted
                  ? GAME_UI_TOKENS.colors.accentGold
                  : GAME_UI_TOKENS.colors.textSecondary,
                WebkitTextStroke: "1px #000000",
                paintOrder: "stroke fill",
                transition: POP_TRANSITION,
              }}
            >
              {"★"}
            </div>
          );
        })}
      </div>
    </div>
  );
}
