import type { PhaseStars } from "./types";

/**
 * Every level is scored out of 5 stars — the same ceiling the map card
 * (`MapInfoBox`) and the investigation's star tracker show.
 */
export const MAX_STARS = 5;

/** "3,4 / 5 ★" — the average of each player's best run, out of 5. */
export function formatStars({ avgStars }: PhaseStars): string {
  const average = avgStars.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${average} / ${MAX_STARS} ★`;
}

/** The average as a fraction of 5, capped at 1 for the bar width. */
export function starsFraction({ avgStars }: PhaseStars): number {
  return Math.min(Math.max(avgStars / MAX_STARS, 0), 1);
}
