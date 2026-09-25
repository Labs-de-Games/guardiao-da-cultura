import type { Rate } from "./types";

/**
 * Client-safe (no server-only import) — moved out of server/metrics.ts so
 * client components (Screen 1's entry-rate/chapter-1-completion-rate
 * cards, computed from two summary counts) can compute a `Rate` the same
 * way the server does, without importing anything under lib/edital/server/.
 * Re-exported from server/metrics.ts for existing server-side call sites.
 *
 * `{value, numerator, denominator}` for every rate the dashboard shows —
 * never an unqualified number (discovery §7, issue #742's own rule).
 * `safeRate(0, 0)` is `0`, not `NaN`; `value` is always clamped to
 * `[0, 1]` — the entry rate specifically *will* exceed 100% because
 * `landing_page_viewed` only fires on `/` while `/game` is linkable
 * direct (issue #742's own note), so the clamp is load-bearing.
 */
/**
 * The institution-wide player goal, per issue #745's HeroMetric comment:
 * a real, known target, deliberately never shown per-institution there
 * ("a per-institution bar against a global target would misrepresent
 * what a single institution's number means"). Issue #808's public
 * dashboard is the one place this target legitimately applies — it's
 * about the whole program, not one institution.
 */
export const EDITAL_ANNUAL_PLAYER_GOAL = 5000;

export function safeRate(numerator: number, denominator: number): Rate {
  if (denominator <= 0) {
    return { value: 0, numerator, denominator };
  }
  const raw = numerator / denominator;
  return {
    value: Math.max(0, Math.min(1, raw)),
    numerator,
    denominator,
  };
}
