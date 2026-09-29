"use client";

import { Box, Typography } from "@mui/material";
import type { InvestigationClue } from "@/game/types/InvestigationTypes";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";
import { ClueHearts } from "./ClueHearts";
import { HoverPopover } from "./HoverPopover";
import { clueImageSrc } from "./investigation-dnd";

const { colors, fonts } = GAME_UI_TOKENS;

/** Hover detail for a clue, floated clear of the rail on the document body. */
export function ClueTooltip({
  clue,
  hearts,
  anchor,
}: {
  clue: InvestigationClue;
  hearts: number;
  anchor: DOMRect;
}) {
  return (
    <HoverPopover anchor={anchor} placement="right" width={350}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          component="img"
          src={clueImageSrc(clue)}
          alt=""
          aria-hidden="true"
          sx={{
            width: 58,
            height: 58,
            objectFit: "contain",
            imageRendering: "pixelated",
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: fonts.display,
              fontSize: "1.3rem",
              color: colors.accentGold,
              lineHeight: 1.15,
            }}
          >
            {clue.title}
          </Typography>
          <ClueHearts hearts={hearts} />
        </Box>
      </Box>

      {clue.educational.medium && (
        <Typography
          sx={{
            fontSize: "0.88rem",
            color: colors.textSecondary,
            fontStyle: "italic",
          }}
        >
          Material: {clue.educational.medium}
        </Typography>
      )}

      <Typography
        sx={{ fontSize: "0.97rem", color: colors.textPrimary, lineHeight: 1.5 }}
      >
        {clue.educational.description}
      </Typography>

      {clue.educational.opinion && (
        <Typography
          sx={{
            fontSize: "0.9rem",
            color: colors.textSecondary,
            fontStyle: "italic",
            lineHeight: 1.5,
            whiteSpace: "pre-line",
            borderLeft: `3px solid ${colors.accentGoldMuted}`,
            pl: 1,
          }}
        >
          {clue.educational.opinion}
        </Typography>
      )}

      <Box sx={{ borderTop: `1px solid ${colors.bgTertiary}`, pt: 1 }}>
        <Typography sx={{ fontSize: "0.8rem", color: colors.textSecondary }}>
          O que esta pista prova
        </Typography>
        <Typography
          sx={{
            fontFamily: fonts.display,
            fontSize: "1.15rem",
            color: colors.accentGold,
            lineHeight: 1.25,
          }}
        >
          {clue.traitLabel}
        </Typography>
      </Box>
    </HoverPopover>
  );
}
