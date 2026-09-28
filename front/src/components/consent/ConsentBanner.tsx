"use client";

import { Box, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent/ConsentContext";
import { PRIVACY_NOTICE_PATH } from "@/lib/consent/privacyNotice";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const TITLE_ID = "consent-banner-title";
const BODY_ID = "consent-banner-body";

/**
 * Sits above MobileBlocker (`UI_LAYERS.NOTIFICATION + 1000`). The blocker
 * covers the viewport below 768px to say the game needs a computer, but a
 * visitor on a phone is still being asked to make a privacy decision and must
 * be able to answer it.
 */
const BANNER_Z_INDEX = UI_LAYERS.NOTIFICATION + 2000;

/**
 * Both buttons share one style and differ only in label — the acceptance
 * criteria require equal visual weight, and nothing may read as the
 * pre-selected option.
 */
const choiceButtonSx = {
  flex: { xs: "1 1 100%", sm: "0 1 auto" },
  minWidth: { sm: 240 },
  px: 3,
  py: 1.5,
  borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
  border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
  bgcolor: "transparent",
  color: GAME_UI_TOKENS.colors.accentGold,
  fontFamily: GAME_UI_TOKENS.fonts.display,
  fontSize: "1.0625rem",
  letterSpacing: "0.04em",
  cursor: "pointer",
  transition: "color 150ms ease, border-color 150ms ease",
  "&:hover": {
    color: GAME_UI_TOKENS.colors.accentGoldHover,
    borderColor: GAME_UI_TOKENS.colors.accentGoldHover,
  },
  "&:focus-visible": {
    outline: `3px solid ${GAME_UI_TOKENS.colors.accentGoldHover}`,
    outlineOffset: "2px",
  },
} as const;

export function ConsentBanner() {
  const { state, accept, decline } = useConsent();
  const panelRef = useRef<HTMLDivElement>(null);

  const visible = state === "undecided";

  useEffect(() => {
    if (visible) panelRef.current?.focus();
  }, [visible]);

  // "loading" covers the first client render, before localStorage has been
  // read — rendering nothing then is what stops the banner flashing at
  // players who already decided.
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: BANNER_Z_INDEX,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <Box
        ref={panelRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={TITLE_ID}
        aria-describedby={BODY_ID}
        tabIndex={-1}
        sx={{
          width: "100%",
          maxWidth: 1100,
          boxSizing: "border-box",
          px: { xs: 2.5, sm: 4 },
          pt: 3,
          pb: "calc(24px + env(safe-area-inset-bottom))",
          bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
          borderTop: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
          borderTopLeftRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          borderTopRightRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          boxShadow: "0 -8px 32px rgba(0,0,0,0.55)",
          outline: "none",
          maxHeight: "80dvh",
          overflowY: "auto",
        }}
      >
        <Typography
          id={TITLE_ID}
          component="h2"
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: { xs: "1.5rem", sm: "1.75rem" },
            color: GAME_UI_TOKENS.colors.textPrimary,
            mb: 1,
          }}
        >
          Dados de uso do jogo
        </Typography>

        <Typography
          id={BODY_ID}
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: { xs: "0.875rem", sm: "0.9375rem" },
            lineHeight: 1.6,
            color: GAME_UI_TOKENS.colors.textPrimary,
            mb: 2.5,
          }}
        >
          Usamos recursos necessários para o jogo funcionar. Com sua
          autorização, também coletamos dados de uso, como fases iniciadas e
          concluídas, respostas, tempo de jogo e erros, para avaliar e melhorar
          o jogo. Não usamos seu nome ou e-mail para essa finalidade.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ alignItems: { xs: "stretch", sm: "center" }, flexWrap: "wrap" }}
        >
          <Box
            component="button"
            type="button"
            onClick={decline}
            sx={choiceButtonSx}
          >
            Continuar sem dados de uso
          </Box>
          <Box
            component="button"
            type="button"
            onClick={accept}
            sx={choiceButtonSx}
          >
            Aceitar dados de uso
          </Box>
          <Box
            component={Link}
            href={PRIVACY_NOTICE_PATH}
            sx={{
              alignSelf: "center",
              py: 1,
              fontFamily: GAME_UI_TOKENS.fonts.body,
              fontSize: "0.875rem",
              color: GAME_UI_TOKENS.colors.textPrimary,
              textDecoration: "underline",
              "&:hover": { color: GAME_UI_TOKENS.colors.accentGoldHover },
              "&:focus-visible": {
                outline: `3px solid ${GAME_UI_TOKENS.colors.accentGoldHover}`,
                outlineOffset: "2px",
              },
            }}
          >
            Saiba mais
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
