import "server-only";
import type { Rate } from "../types";

/**
 * `{value, numerator, denominator}` for every rate the dashboard shows —
 * never an unqualified number (discovery §7's "the number is not
 * defensible to an auditor" mitigation). `safeRate(0, 0)` is `0`, not
 * `NaN`; `value` is always clamped to `[0, 1]` — a numerator can't
 * legitimately exceed its denominator in this domain, and a clamp is
 * safer than surfacing a >100% rate to an auditor.
 */
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

/**
 * Enforces that a funnel's step counts are monotonically non-increasing —
 * step N+1 can never exceed step N. A HogQL `windowFunnel` result should
 * already guarantee this; this is the defensive clamp for whatever
 * doesn't (a fallback `uniqExactIf`-based computation per discovery §6, or
 * a data glitch). Clamping down (never up) means the auditor-facing number
 * is always the conservative one.
 */
export function clampMonotonicFunnel(steps: number[]): number[] {
  const clamped: number[] = [];
  let previous = Number.POSITIVE_INFINITY;
  for (const step of steps) {
    const value = Math.min(step, previous);
    clamped.push(value);
    previous = value;
  }
  return clamped;
}
