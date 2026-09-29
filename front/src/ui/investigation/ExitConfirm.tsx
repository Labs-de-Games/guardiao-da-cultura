"use client";

import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors, fonts, radius } = GAME_UI_TOKENS;

type Choice = "stay" | "leave";

function ChoiceButton({
  label,
  onClick,
  tone,
  selected,
}: {
  label: string;
  onClick: () => void;
  tone: "neutral" | "danger";
  selected: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        flex: 1,
        px: 2,
        py: 1.25,
        cursor: "pointer",
        border: tone === "neutral" ? `1px solid ${colors.bgTertiary}` : "none",
        borderRadius: `${radius.small}px`,
        bgcolor: tone === "neutral" ? "transparent" : "#8c3b3b",
        color:
          tone === "neutral" && !selected
            ? colors.textSecondary
            : colors.textPrimary,
        fontFamily: fonts.display,
        fontSize: "1.15rem",
        letterSpacing: "0.03em",
        outline: "none",
        boxShadow: selected ? `0 0 0 2px ${colors.accentGold}` : "none",
        "&:hover": { filter: "brightness(1.15)", color: colors.textPrimary },
      }}
    >
      {label}
    </Box>
  );
}

/**
 * The "quer mesmo sair?" gate.
 *
 * Leaving is not free: the run is rebuilt from scratch on the way back in, so
 * a board the player spent hearts arranging goes with them. ESC is a key that
 * gets pressed by reflex, and VOLTAR sits next to COMO JOGAR — neither should
 * be able to throw the work away on one press. Opens on "Continuar aqui", the
 * same way the accusation gate opens on Cancelar.
 */
export function ExitConfirm() {
  const open = useGameUIStore((s) => s.investigation.exitConfirmOpen);
  const setExitConfirmOpen = useGameUIStore((s) => s.setExitConfirmOpen);

  const [choice, setChoice] = useState<Choice>("stay");

  useEffect(() => {
    if (open) setChoice("stay");
  }, [open]);

  const leave = useCallback(() => {
    setExitConfirmOpen(false);
    EventBus.emit("investigation:exit", undefined);
  }, [setExitConfirmOpen]);

  // ESC closes this panel rather than the phase — the screen's own handler
  // leaves it alone while it is up.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === "ArrowLeft" || key === "a") {
        event.preventDefault();
        setChoice("stay");
        return;
      }
      if (key === "ArrowRight" || key === "d") {
        event.preventDefault();
        setChoice("leave");
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        if (choice === "leave") leave();
        else setExitConfirmOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, choice, leave, setExitConfirmOpen]);

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        zIndex: 4,
        bgcolor: "rgba(0,0,0,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
      onClick={() => setExitConfirmOpen(false)}
    >
      <Box
        role="dialog"
        aria-label="Confirmar saída da investigação"
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: "min(480px, 100%)",
          bgcolor: colors.bgSecondary,
          border: `2px solid ${colors.accentGoldMuted}`,
          borderRadius: `${radius.panel}px`,
          p: { xs: 2, md: 2.5 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: "1.55rem",
            color: colors.accentGold,
            lineHeight: 1.15,
          }}
        >
          Sair da investigação?
        </Typography>
        <Typography
          sx={{
            fontSize: "1.02rem",
            color: colors.textPrimary,
            lineHeight: 1.5,
          }}
        >
          A próxima visita você recomeça com todas as pistas na barra lateral.
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <ChoiceButton
            label="Continuar aqui"
            tone="neutral"
            selected={choice === "stay"}
            onClick={() => setExitConfirmOpen(false)}
          />
          <ChoiceButton
            label="Sair"
            tone="danger"
            selected={choice === "leave"}
            onClick={leave}
          />
        </Box>
      </Box>
    </Box>
  );
}
