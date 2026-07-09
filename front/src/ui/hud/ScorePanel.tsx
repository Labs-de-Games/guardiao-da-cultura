"use client";

import { LayoutConfig } from "@/game/constants/LayoutConfig";
import { UI_Z_INDEX } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

export function ScorePanel() {
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
    />
  );
}
