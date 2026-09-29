"use client";

import { Box, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors, fonts, radius } = GAME_UI_TOKENS;

type Choice = "cancel" | "confirm";

function ConfirmButton({
  label,
  onClick,
  tone,
  selected,
}: {
  label: string;
  onClick: () => void;
  tone: "neutral" | "danger";
  /** The keyboard is resting on this one. */
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
 * The "tem certeza?" gate.
 *
 * An accusation is the only irreversible move in the phase — it burns a star
 * and wipes the board — so it never fires straight off the seat button. The
 * keyboard lands on Cancelar rather than on the accusation, for the same
 * reason: the dangerous half should take a deliberate press to reach.
 */
export function AccuseConfirm() {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const pendingAccusationId = useGameUIStore(
    (s) => s.investigation.pendingAccusationId,
  );
  const requestAccusation = useGameUIStore((s) => s.requestAccusation);
  const accuseSuspect = useGameUIStore((s) => s.accuseSuspect);

  const suspect = payload?.suspects.find((s) => s.id === pendingAccusationId);
  const [choice, setChoice] = useState<Choice>("cancel");

  // Every fresh accusation starts on Cancelar, never on the one that costs a star.
  useEffect(() => {
    setChoice("cancel");
  }, [pendingAccusationId]);

  const confirm = useCallback(() => {
    if (!suspect) return;
    const outcome = accuseSuspect(suspect.id);
    if (outcome) {
      EventBus.emit("investigation:completed", {
        stars: outcome.stars,
        wrongAttempts: outcome.wrongAttempts,
        correct: outcome.correct,
      });
    }
  }, [accuseSuspect, suspect]);

  // ESC is the screen's own — it cancels the pending accusation from out there.
  useEffect(() => {
    if (!suspect) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

      if (key === "ArrowLeft" || key === "a") {
        event.preventDefault();
        setChoice("cancel");
        return;
      }
      if (key === "ArrowRight" || key === "d") {
        event.preventDefault();
        setChoice("confirm");
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        if (choice === "confirm") confirm();
        else requestAccusation(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [suspect, choice, confirm, requestAccusation]);

  if (!suspect) return null;

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
      onClick={() => requestAccusation(null)}
    >
      <Box
        role="dialog"
        aria-label={`Confirmar acusação de ${suspect.name}`}
        onClick={(e) => e.stopPropagation()}
        sx={{
          width: "min(480px, 100%)",
          bgcolor: colors.bgSecondary,
          border: "2px solid #8c3b3b",
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
          Tem certeza?
        </Typography>
        <Typography
          sx={{
            fontSize: "1.02rem",
            color: colors.textPrimary,
            lineHeight: 1.5,
          }}
        >
          Acusar {suspect.name} custa uma estrela se você estiver errado, e as
          pistas voltam todas para a barra lateral.
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <ConfirmButton
            label="Cancelar"
            tone="neutral"
            selected={choice === "cancel"}
            onClick={() => requestAccusation(null)}
          />
          <ConfirmButton
            label="Sim, acusar"
            tone="danger"
            selected={choice === "confirm"}
            onClick={confirm}
          />
        </Box>
      </Box>
    </Box>
  );
}
