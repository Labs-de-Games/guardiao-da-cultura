"use client";

import { Box } from "@mui/material";

/** One full red → blue cycle. Slow enough to read as a beacon, not a strobe. */
const CYCLE_MS = 1600;

/**
 * The two beams, bleeding in from opposite edges.
 *
 * Anchored off-screen so only the falloff reaches the room, which is what keeps
 * them reading as light spilling in through a window rather than as coloured
 * panels laid over the art.
 */
const BEAMS = [
  {
    key: "red",
    color: "255, 58, 48",
    background:
      "radial-gradient(ellipse 62% 78% at -4% 38%, rgba(255,58,48,0.85), rgba(255,58,48,0) 68%)",
    delay: 0,
  },
  {
    key: "blue",
    color: "60, 120, 255",
    background:
      "radial-gradient(ellipse 62% 78% at 104% 58%, rgba(60,120,255,0.85), rgba(60,120,255,0) 68%)",
    delay: CYCLE_MS / 2,
  },
] as const;

/**
 * Police lights washing over the room behind the closing panel.
 *
 * Drawn under the result dialog and over its dim, so the corkboard the player
 * spent the phase working on stays readable underneath — the arrest is
 * happening in the room they know, not on a blank screen.
 *
 * `screen` blending is what makes it light rather than paint: the beams add to
 * what is already there instead of tinting it flat, so the dim stays dim.
 *
 * Photosensitivity: the alternation is a shade under 1.3Hz, far below the 3Hz
 * flash threshold, and `prefers-reduced-motion` holds both beams steady rather
 * than removing them.
 */
export function SirenLights() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    >
      {BEAMS.map((beam) => (
        <Box
          key={beam.key}
          sx={{
            position: "absolute",
            inset: 0,
            background: beam.background,
            opacity: 0.18,
            animation: `siren-${beam.key} ${CYCLE_MS}ms ease-in-out ${beam.delay}ms infinite`,
            [`@keyframes siren-${beam.key}`]: {
              "0%, 100%": { opacity: 0.12 },
              // The peak is brief: a beacon is mostly dark, which is what stops
              // a long wait on this panel from becoming a light show.
              "35%": { opacity: 0.55 },
              "60%": { opacity: 0.16 },
            },
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
              opacity: 0.3,
            },
          }}
        />
      ))}
    </Box>
  );
}
