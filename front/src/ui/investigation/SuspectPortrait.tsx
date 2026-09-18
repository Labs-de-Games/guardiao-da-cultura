"use client";

import { Box, Typography } from "@mui/material";
import { useState } from "react";
import type { Suspect } from "@/game/types/InvestigationTypes";
import { GAME_UI_TOKENS } from "@/ui/theme/tokens";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Suspect portrait with a graceful fallback.
 *
 * No portrait artwork exists yet, so a suspect without a `portrait` — or whose
 * image fails to load — renders as monogrammed initials in the same palette.
 * Dropping real PNGs into `/assets/investigation/portraits/` is all it takes.
 */
export function SuspectPortrait({
  suspect,
  size = 96,
  dimmed = false,
}: {
  suspect: Suspect;
  /** Any CSS length — the seats size themselves off the corkboard, not pixels. */
  size?: number | string;
  dimmed?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = suspect.portrait
    ? `/assets/investigation/portraits/${suspect.portrait}`
    : null;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        // The monogram fallback sizes itself off this, so `size` can be a
        // container-relative length rather than a number of pixels.
        fontSize: size,
        flexShrink: 0,
        borderRadius: `${GAME_UI_TOKENS.radius.small}px`,
        border: `2px solid ${GAME_UI_TOKENS.colors.accentGoldMuted}`,
        bgcolor: GAME_UI_TOKENS.colors.bgPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: dimmed ? 0.45 : 1,
        filter: dimmed ? "grayscale(1)" : "none",
        transition: "opacity 120ms linear, filter 120ms linear",
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={suspect.name}
          onError={() => setFailed(true)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Typography
          aria-hidden="true"
          sx={{
            fontFamily: GAME_UI_TOKENS.fonts.display,
            fontSize: "0.36em",
            lineHeight: 1,
            color: GAME_UI_TOKENS.colors.accentGold,
            letterSpacing: "0.05em",
          }}
        >
          {initialsOf(suspect.name)}
        </Typography>
      )}
    </Box>
  );
}
