"use client";

import { Box } from "@mui/material";
import { INVESTIGATION_CLUE_HEARTS } from "@/game/constants/Investigation";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors } = GAME_UI_TOKENS;

/**
 * A clue's remaining lives.
 *
 * Each drop onto a suspect burns one; the last one nails the clue in place, so
 * this row is really a countdown of how many suspects it can still visit.
 */
export function ClueHearts({
  hearts,
  size = "1.05rem",
}: {
  hearts: number;
  size?: string;
}) {
  return (
    <Box
      aria-label={`${hearts} de ${INVESTIGATION_CLUE_HEARTS} usos restantes`}
      sx={{ display: "flex", gap: 0.4, fontSize: size, lineHeight: 1 }}
    >
      {Array.from({ length: INVESTIGATION_CLUE_HEARTS }, (_, i) => (
        <Box
          key={`heart-${i}`}
          component="span"
          aria-hidden="true"
          sx={{
            color: i < hearts ? "#c9455a" : colors.bgTertiary,
            filter: i < hearts ? "none" : "grayscale(1)",
          }}
        >
          {i < hearts ? "♥" : "♡"}
        </Box>
      ))}
    </Box>
  );
}
