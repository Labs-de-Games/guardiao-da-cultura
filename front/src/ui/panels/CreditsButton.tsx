"use client";

import { Box } from "@mui/material";
import { EventBus } from "@/shared/events/event-bus";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

export function CreditsButton() {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => EventBus.emit("credits:open", undefined)}
      sx={{
        position: "absolute",
        bottom: "15px",
        right: "15px",
        zIndex: UI_LAYERS.HUD,
        pointerEvents: "auto",
        bgcolor: "#252726",
        border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
        borderRadius: "8px",
        px: "16px",
        py: "8px",
        cursor: "pointer",
        fontFamily: GAME_UI_TOKENS.fonts.display,
        fontSize: "16px",
        letterSpacing: "0.04em",
        color: GAME_UI_TOKENS.colors.accentGold,
        "&:hover": {
          color: GAME_UI_TOKENS.colors.accentGoldHover,
          borderColor: GAME_UI_TOKENS.colors.accentGoldHover,
        },
      }}
    >
      Créditos
    </Box>
  );
}
