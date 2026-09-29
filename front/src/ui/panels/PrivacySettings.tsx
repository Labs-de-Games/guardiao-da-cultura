"use client";

import { Box, Paper, Stack, Typography } from "@mui/material";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { type ConsentState, useConsent } from "@/lib/consent/ConsentContext";
import { PRIVACY_NOTICE_PATH } from "@/lib/consent/privacyNotice";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS, UI_LAYERS } from "@/ui/theme/tokens";

const TITLE_ID = "privacy-settings-title";

const actionButtonSx = {
  px: 3,
  py: 1.25,
  borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
  border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
  bgcolor: "transparent",
  color: GAME_UI_TOKENS.colors.accentGold,
  fontFamily: GAME_UI_TOKENS.fonts.display,
  fontSize: "1rem",
  letterSpacing: "0.04em",
  cursor: "pointer",
  "&:hover": {
    color: GAME_UI_TOKENS.colors.accentGoldHover,
    borderColor: GAME_UI_TOKENS.colors.accentGoldHover,
  },
  "&:focus-visible": {
    outline: `3px solid ${GAME_UI_TOKENS.colors.accentGoldHover}`,
    outlineOffset: "2px",
  },
} as const;

const STATUS_LABEL: Record<ConsentState, string> = {
  accepted: "Você autorizou a coleta de dados de uso.",
  declined: "Você não autorizou a coleta de dados de uso.",
  undecided: "Você ainda não escolheu.",
  // A stale record is not a live authorisation, and must never be shown as
  // one: nothing is being collected until the player confirms again.
  stale:
    "Nosso aviso de privacidade mudou desde a sua escolha. Nada está sendo " +
    "coletado até você confirmar.",
  loading: "Carregando…",
};

/**
 * Privacy entry point on the world map, next to Créditos. Lets a player
 * authorise collection later, or revoke one already given — the "alteração da
 * escolha" requirement of issue #864.
 */
export function PrivacySettings() {
  const open = useGameUIStore((s) => s.privacyOpen);
  const setPrivacyOpen = useGameUIStore((s) => s.setPrivacyOpen);
  const { state, record, accept, revoke } = useConsent();
  const panelRef = useRef<HTMLDivElement>(null);

  /**
   * Announced on the EventBus as well as written to the store: the store is
   * what `MapIntroScene` polls synchronously, while the event is what lets it
   * cancel the auto-start countdown at the moment the panel opens. Opening
   * this panel is the player pausing to make a consent decision — the map must
   * not start a level underneath them while they read (issue #864).
   */
  const openPanel = useCallback(() => {
    setPrivacyOpen(true);
    EventBus.emit("privacy:open", undefined);
  }, [setPrivacyOpen]);

  const close = useCallback(() => {
    setPrivacyOpen(false);
    EventBus.emit("privacy:close", undefined);
  }, [setPrivacyOpen]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();

    // Capture phase, like ControlsPanel: the key must not reach Phaser.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  /**
   * The open flag now lives in a module-level store, which outlives this
   * component: leaving the game by following the "Ler o Aviso de Privacidade"
   * link unmounts the panel but would otherwise leave `privacyOpen` stuck at
   * true, so the next visit to the map would boot with an invisible modal
   * blocking every start. Unmount is the one moment the panel is provably
   * gone, so clear the flag there — without announcing a close the player
   * never performed.
   */
  useEffect(() => {
    return () => useGameUIStore.getState().setPrivacyOpen(false);
  }, []);

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={openPanel}
        sx={{
          position: "absolute",
          bottom: "15px",
          right: "140px",
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
        Privacidade
      </Box>

      {open && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.6)",
            pointerEvents: "auto",
            zIndex: UI_LAYERS.PANEL,
          }}
          onClick={close}
        >
          <Paper
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            tabIndex={-1}
            elevation={8}
            sx={{
              width: { xs: "92%", sm: 540 },
              maxHeight: "85dvh",
              overflowY: "auto",
              bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
              border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
              borderRadius: `${GAME_UI_TOKENS.radius.panel}px`,
              p: 4,
              outline: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography
              id={TITLE_ID}
              component="h2"
              sx={{
                fontFamily: GAME_UI_TOKENS.fonts.display,
                fontSize: "1.75rem",
                color: GAME_UI_TOKENS.colors.textPrimary,
                mb: 1.5,
              }}
            >
              Configurações de privacidade
            </Typography>

            <Typography
              sx={{
                fontFamily: GAME_UI_TOKENS.fonts.body,
                fontSize: "0.9375rem",
                lineHeight: 1.6,
                color: GAME_UI_TOKENS.colors.textPrimary,
                mb: 1,
              }}
            >
              {STATUS_LABEL[state]}
            </Typography>

            {record && (
              <Typography
                sx={{
                  fontFamily: GAME_UI_TOKENS.fonts.body,
                  fontSize: "0.8125rem",
                  color: GAME_UI_TOKENS.colors.textSecondary,
                  mb: 2.5,
                }}
              >
                Escolha registrada em{" "}
                {new Date(record.decidedAt).toLocaleString("pt-BR")} (aviso
                versão {record.noticeVersion}).
              </Typography>
            )}

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mb: 3 }}
            >
              {state !== "accepted" && (
                <Box
                  component="button"
                  type="button"
                  onClick={accept}
                  sx={actionButtonSx}
                >
                  Autorizar dados de uso
                </Box>
              )}
              {state === "accepted" && (
                <Box
                  component="button"
                  type="button"
                  onClick={revoke}
                  sx={actionButtonSx}
                >
                  Revogar autorização
                </Box>
              )}
              <Box
                component="button"
                type="button"
                onClick={close}
                sx={actionButtonSx}
              >
                Fechar
              </Box>
            </Stack>

            <Box
              component={Link}
              href={PRIVACY_NOTICE_PATH}
              sx={{
                fontFamily: GAME_UI_TOKENS.fonts.body,
                fontSize: "0.875rem",
                color: GAME_UI_TOKENS.colors.accentGold,
                textDecoration: "underline",
              }}
            >
              Ler o Aviso de Privacidade
            </Box>
          </Paper>
        </Box>
      )}
    </>
  );
}
