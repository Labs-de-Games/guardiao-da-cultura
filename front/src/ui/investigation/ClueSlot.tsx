"use client";

import { useDroppable } from "@dnd-kit/core";
import { Box, Typography } from "@mui/material";
import type {
  ClueVerdict,
  InvestigationClue,
} from "@/game/types/InvestigationTypes";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { clueImageSrc, slotDropId } from "./investigation-dnd";

const { colors, fonts, radius } = GAME_UI_TOKENS;

export const VERDICT_STYLE: Record<
  ClueVerdict,
  { glyph: string; label: string; color: string }
> = {
  quente: { glyph: "🔥", label: "Quente", color: "#c4553d" },
  morno: { glyph: "🌡", label: "Morno", color: "#d9ad56" },
  frio: { glyph: "❄", label: "Frio", color: "#5b8fb0" },
};

/**
 * One seat at one suspect. Dropping a clue here grades it on the spot, so the
 * verdict below is never stale — it always describes what is in the slot.
 */
export function ClueSlot({
  suspectId,
  index,
  clue,
  verdict,
  locked,
  disabled,
  frozen,
  onClear,
}: {
  suspectId: string;
  index: number;
  clue: InvestigationClue | null;
  verdict: ClueVerdict | null;
  /** The clue in this slot spent its last heart and can no longer be moved. */
  locked: boolean;
  /** The whole seat is out of play — the suspect has already been cleared. */
  disabled: boolean;
  /**
   * Held still by the walkthrough. Unlike `locked` this is temporary and says
   * nothing about the clue, so it draws no padlock and does not dim the slot —
   * the walkthrough is pointing straight at it.
   */
  frozen: boolean;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: slotDropId(suspectId, index),
    disabled: disabled || locked || frozen,
  });

  const borderColor = verdict
    ? VERDICT_STYLE[verdict].color
    : isOver
      ? colors.accentGold
      : colors.accentGoldMuted;

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}
    >
      <Box
        ref={setNodeRef}
        data-clue-slot={index}
        data-clue-key={clue?.key}
        aria-label={
          clue
            ? `Espaço ${index + 1}: ${clue.title}${verdict ? `, ${VERDICT_STYLE[verdict].label}` : ""}`
            : `Espaço ${index + 1}, vazio`
        }
        sx={{
          position: "relative",
          width: "var(--slot)",
          height: "var(--slot)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: isOver ? colors.bgTertiary : colors.bgPrimary,
          border: `2px ${clue ? "solid" : "dashed"} ${borderColor}`,
          borderRadius: `${radius.small}px`,
          opacity: disabled ? 0.5 : 1,
          transition:
            "border-color 120ms linear, background-color 120ms linear",
        }}
      >
        {clue ? (
          <>
            <Box
              component="img"
              src={clueImageSrc(clue)}
              alt=""
              aria-hidden="true"
              draggable={false}
              sx={{
                width: "64%",
                height: "64%",
                objectFit: "contain",
                imageRendering: "pixelated",
              }}
            />
            {locked ? (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  top: "-8%",
                  right: "-8%",
                  fontSize: "calc(var(--slot) * 0.32)",
                  lineHeight: 1,
                }}
              >
                🔒
              </Box>
            ) : frozen ? null : (
              <Box
                component="button"
                type="button"
                onClick={onClear}
                disabled={disabled}
                aria-label={`Remover ${clue.title} do espaço ${index + 1}`}
                sx={{
                  position: "absolute",
                  top: "-12%",
                  right: "-12%",
                  width: "calc(var(--slot) * 0.38)",
                  height: "calc(var(--slot) * 0.38)",
                  p: 0,
                  lineHeight: 1,
                  fontSize: "calc(var(--slot) * 0.26)",
                  cursor: "pointer",
                  color: colors.textSecondary,
                  bgcolor: colors.bgSecondary,
                  border: `1px solid ${colors.bgTertiary}`,
                  borderRadius: "50%",
                  "&:hover": { color: colors.textPrimary },
                }}
              >
                ×
              </Box>
            )}
            {verdict && (
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  bottom: "-8%",
                  left: "-8%",
                  fontSize: "calc(var(--slot) * 0.38)",
                  lineHeight: 1,
                }}
              >
                {VERDICT_STYLE[verdict].glyph}
              </Box>
            )}
          </>
        ) : (
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: "calc(var(--slot) * 0.5)",
              color: colors.bgTertiary,
              userSelect: "none",
            }}
          >
            +
          </Typography>
        )}
      </Box>

      <Typography
        sx={{
          fontSize: "var(--seat-small)",
          textAlign: "center",
          lineHeight: 1.2,
          minHeight: "1.3em",
          fontWeight: verdict ? 700 : 400,
          color: verdict ? VERDICT_STYLE[verdict].color : colors.textSecondary,
        }}
      >
        {verdict ? VERDICT_STYLE[verdict].label : ""}
      </Typography>
    </Box>
  );
}
