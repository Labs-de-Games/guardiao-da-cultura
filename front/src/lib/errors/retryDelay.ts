const BASE_DELAY_MS = 30_000;
const MAX_DELAY_MS = 300_000;
const JITTER_RATIO = 0.3;

/**
 * Exponential backoff with ±30% jitter, so players polling during an outage
 * don't all hit the backend (or reload) at the same moment.
 */
export function nextRetryDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const base = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
  const jitter = 1 + (random() * 2 - 1) * JITTER_RATIO;
  return Math.round(base * jitter);
}
