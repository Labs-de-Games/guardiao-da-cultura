"use client";

import { Box, Typography } from "@mui/material";
import { useEffect } from "react";
import { INVESTIGATION_MAX_WRONG_ATTEMPTS } from "@/game/constants/Investigation";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { SuspectPortrait } from "./SuspectPortrait";

const { colors, fonts, radius } = GAME_UI_TOKENS;

/**
 * What a wrong accusation gets you: the suspect answering back.
 *
 * The alibi always restates a trait their own dossier contradicts, so the
 * player leaves with the reason they were wrong rather than just the verdict —
 * which is the whole point of a phase about reading evidence. The board behind
 * this panel is still exactly as they arranged it; dismissing is what sends the
 * clues home.
 */
export function AccuseFeedback({ onDismiss }: { onDismiss: () => void }) {
  const payload = useGameUIStore((s) => s.investigation.payload);
  const lastWrongSuspectId = useGameUIStore(
    (s) => s.investigation.lastWrongSuspectId,
  );
  const wrongAttempts = useGameUIStore((s) => s.investigation.wrongAttempts);

  const suspect = payload?.suspects.find((s) => s.id === lastWrongSuspectId);

  // CONTINUAR is the only thing on this panel, so ENTER and SPACE reach it
  // directly. Asking the focus ring for it is not enough: the phase moves DOM
  // focus around the board itself, so the panel cannot count on being handed
  // it. ESC is the screen's own — it dismisses this panel from out there.
  useEffect(() => {
    if (!suspect) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onDismiss();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [suspect, onDismiss]);

  if (!suspect) return null;

  const attemptsLeft = INVESTIGATION_MAX_WRONG_ATTEMPTS - wrongAttempts;

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
    >
      <Box
        role="dialog"
        aria-label={`${suspect.name} responde à acusação`}
        sx={{
          width: "min(520px, 100%)",
          bgcolor: colors.bgSecondary,
          border: `2px solid ${colors.accentGoldMuted}`,
          borderRadius: `${radius.panel}px`,
          p: { xs: 2, md: 2.5 },
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Box sx={{ flexShrink: 0, lineHeight: 0 }}>
            <SuspectPortrait suspect={suspect} size={84} />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: "1.05rem",
                color: colors.textPrimary,
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              “{suspect.alibi}”
            </Typography>
            <Typography
              sx={{
                mt: 1,
                fontFamily: fonts.display,
                fontSize: "1.1rem",
                color: colors.accentGold,
                lineHeight: 1.2,
              }}
            >
              — {suspect.name}
            </Typography>
            <Typography
              sx={{ fontSize: "0.85rem", color: colors.textSecondary }}
            >
              {suspect.role}
            </Typography>
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: "0.9rem",
            color: "#c96a6a",
            borderTop: `1px solid ${colors.bgTertiary}`,
            pt: 1.5,
          }}
        >
          −1 estrela ·{" "}
          {attemptsLeft <= 0
            ? "sem tentativas restantes"
            : attemptsLeft === 1
              ? "última tentativa"
              : `${attemptsLeft} tentativas restantes`}
        </Typography>

        <Box
          component="button"
          type="button"
          autoFocus
          onClick={onDismiss}
          sx={{
            alignSelf: "flex-end",
            px: 3,
            py: 1.25,
            cursor: "pointer",
            border: "none",
            borderRadius: `${radius.small}px`,
            bgcolor: colors.accentGold,
            color: colors.bgPrimary,
            fontFamily: fonts.display,
            fontSize: "1.05rem",
            letterSpacing: "0.03em",
            "&:hover": { bgcolor: colors.accentGoldHover },
          }}
        >
          CONTINUAR
        </Box>
      </Box>
    </Box>
  );
}
