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

/** Where suspect artwork lives; `portrait` in the dossier names the file. */
const PORTRAIT_DIR = "/assets/ui/suspects";

/**
 * Suspect portrait with a graceful fallback.
 *
 * Artwork is still arriving one suspect at a time, so anyone without a
 * `portrait` — or whose image is not on disk yet — renders as monogrammed
 * initials in the same palette. Dropping a PNG into `PORTRAIT_DIR` under the
 * name the dossier already gives is all it takes to replace one.
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
  const src = suspect.portrait ? `${PORTRAIT_DIR}/${suspect.portrait}` : null;

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
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // The art is pixel art at 106px and the seats scale well past it.
            imageRendering: "pixelated",
          }}
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
