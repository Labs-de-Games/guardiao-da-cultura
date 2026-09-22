"use client";

import { Box, Typography } from "@mui/material";
import {
  INVESTIGATION_STARS_BY_WRONG_ATTEMPTS,
  starsForWrongAttempts,
} from "@/game/constants/Investigation";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

const { colors } = GAME_UI_TOKENS;

const GOLD_STAR = "/assets/ui/stars/gold_star.png";
const GRAY_STAR = "/assets/ui/stars/star_gray.png";
const MAX_STARS = INVESTIGATION_STARS_BY_WRONG_ATTEMPTS[0];

/**
 * What the next accusation is worth, kept on screen for the whole run.
 *
 * The confirm dialog warns that a wrong name costs a star, but that warning is
 * read once and before the fact. Standing here, the price is visible while the
 * player is still deciding — and a star going out is the one piece of feedback
 * a wrong accusation needs no words for.
 */
export function StarTracker() {
  const wrongAttempts = useGameUIStore((s) => s.investigation.wrongAttempts);
  const stars = starsForWrongAttempts(wrongAttempts);

  return (
    <Box
      sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
      aria-label={`${stars} de ${MAX_STARS} estrelas em jogo`}
    >
      <Box sx={{ display: "flex", gap: 0.4 }} aria-hidden="true">
        {Array.from({ length: MAX_STARS }, (_, i) => (
          <Box
            key={i}
            component="img"
            src={i < stars ? GOLD_STAR : GRAY_STAR}
            alt=""
            sx={{
              width: 40,
              height: 19,
              scale: 2,
              objectFit: "contain",
              // A star already spent stays in place rather than disappearing,
              // so the row reads as a cost paid, not a shorter row.
              opacity: i < stars ? 1 : 0.45,
              transition: "opacity 200ms linear",
            }}
          />
        ))}
      </Box>
      <Typography
        aria-hidden="true"
        sx={{
          fontSize: "0.9rem",
          ml: 1.5,
          color: colors.textSecondary,
          whiteSpace: "nowrap",
        }}
      >
        {stars === 1 ? "1 estrela em jogo" : `${stars} estrelas em jogo`}
      </Typography>
    </Box>
  );
}
