"use client";

import { Box, Typography } from "@mui/material";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

// The game relies on keyboard controls and a 1920x1080 canvas, so it is
// blocked below this width.
export const MOBILE_MEDIA_QUERY = "@media (max-width: 767.98px)";

const TITLE_ID = "mobile-blocker-title";

export function MobileBlocker() {
  return (
    <Box
      data-mobile-blocker="true"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: UI_LAYERS.NOTIFICATION + 1000,
        bgcolor: "rgba(0,0,0,0.6)",
        display: "none",
        alignItems: "flex-end",
        justifyContent: "center",
        pointerEvents: "auto",
        touchAction: "none",
        overflow: "hidden",
        [MOBILE_MEDIA_QUERY]: {
          display: "flex",
        },
      }}
    >
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        sx={{
          width: "100%",
          boxSizing: "border-box",
          minHeight: "55dvh",
          maxHeight: "65dvh",
          overflowX: "hidden",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 3,
          pt: 4,
          pb: "calc(32px + env(safe-area-inset-bottom))",
          bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
          borderTop: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
          borderTopLeftRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          borderTopRightRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          textAlign: "center",
        }}
      >
        <Typography
          id={TITLE_ID}
          component="h2"
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: "clamp(1.75rem, 8vw, 2.25rem)",
            letterSpacing: "0.04em",
            lineHeight: 1.1,
            color: GAME_UI_TOKENS.colors.accentGold,
            overflowWrap: "anywhere",
          }}
        >
          Melhor no computador
        </Typography>

        <Typography
          sx={{
            maxWidth: 420,
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: "clamp(0.95rem, 4.2vw, 1.125rem)",
            lineHeight: 1.5,
            color: GAME_UI_TOKENS.colors.textPrimary,
            overflowWrap: "anywhere",
          }}
        >
          O Guardião da Cultura foi feito para ser jogado no computador, com
          teclado. Acesse pelo seu desktop para continuar a missão.
        </Typography>
      </Box>
    </Box>
  );
}
