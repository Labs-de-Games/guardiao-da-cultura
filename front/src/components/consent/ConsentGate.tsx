"use client";

import { Box, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useConsent } from "@/lib/consent/ConsentContext";
import { PRIVACY_NOTICE_PATH } from "@/lib/consent/privacyNotice";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const TITLE_ID = "consent-gate-title";
const BODY_ID = "consent-gate-body";

/**
 * Above MobileBlocker (`UI_LAYERS.NOTIFICATION + 1000`). The blocker covers the
 * viewport below 768px to say the game needs a computer, but a visitor on a
 * phone is still being asked for a privacy decision and must be able to answer.
 */
const GATE_Z_INDEX = UI_LAYERS.NOTIFICATION + 2000;

/**
 * Both choices share one style and differ only in label — the acceptance
 * criteria require equal visual weight, and nothing may read as pre-selected.
 */
const choiceButtonSx = {
  flex: { xs: "1 1 100%", sm: "1 1 0" },
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

/**
 * Blocking consent dialog. The player must answer before reaching the game,
 * whether they arrive at `/` or straight at `/game` — but either answer lets
 * them through, so refusing never costs access (issue #864).
 *
 * Only the choice is forced, never a particular choice: there is no default,
 * no dismissal, and no Escape.
 */
export function ConsentGate() {
  const { state, accept, decline } = useConsent();
  const dialogRef = useRef<HTMLDivElement>(null);

  const visible = state === "undecided";

  // Self-contained focus trap. The repo has no shared utility, and this
  // dialog has exactly three controls, so a local cycle is enough.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    // No default choice exists, so there is nothing for Escape to mean.
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.key !== "Tab") return;

    const focusables =
      dialogRef.current?.querySelectorAll<HTMLElement>("button, a[href]");
    if (!focusables || focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    // The dialog container itself holds focus on mount. It sits before the
    // controls, so going backwards from it would leave the dialog entirely —
    // treat it as the start and wrap.
    const atStart = active === first || active === dialogRef.current;

    if (e.shiftKey ? atStart : active === last) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  }, []);

  useEffect(() => {
    if (visible) dialogRef.current?.focus();
  }, [visible]);

  // Capture-phase guard: while the dialog is up, keys must not reach Phaser
  // or the page behind it.
  useEffect(() => {
    if (!visible) return;
    const swallow = (e: KeyboardEvent) => {
      if (dialogRef.current?.contains(document.activeElement)) return;
      e.preventDefault();
      e.stopPropagation();
      dialogRef.current?.focus();
    };
    window.addEventListener("keydown", swallow, true);
    return () => window.removeEventListener("keydown", swallow, true);
  }, [visible]);

  // "loading" covers the first client render, before localStorage has been
  // read — rendering nothing then is what stops the dialog flashing at
  // players who already decided.
  if (!visible) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the backdrop exists
    // to swallow input, not to be operated; it is deliberately not dismissible.
    <Box
      onKeyDown={onKeyDown}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: GATE_Z_INDEX,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        bgcolor: "rgba(0,0,0,0.78)",
        pointerEvents: "auto",
        overflowY: "auto",
      }}
    >
      <Box
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={BODY_ID}
        tabIndex={-1}
        sx={{
          width: "100%",
          maxWidth: 620,
          boxSizing: "border-box",
          my: 4,
          px: { xs: 3, sm: 4 },
          py: { xs: 3, sm: 4 },
          bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
          border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
          borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          outline: "none",
        }}
      >
        <Typography
          id={TITLE_ID}
          component="h2"
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: { xs: "1.5rem", sm: "1.875rem" },
            color: GAME_UI_TOKENS.colors.textPrimary,
            mb: 1.5,
          }}
        >
          Dados de uso do jogo
        </Typography>

        <Typography
          id={BODY_ID}
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.body,
            fontSize: { xs: "0.875rem", sm: "0.9375rem" },
            lineHeight: 1.65,
            color: GAME_UI_TOKENS.colors.textPrimary,
            mb: 3,
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
          sx={{ mb: 2.5 }}
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
        </Stack>

        <Box
          component={Link}
          href={PRIVACY_NOTICE_PATH}
          sx={{
            display: "inline-block",
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
      </Box>
    </Box>
  );
}
