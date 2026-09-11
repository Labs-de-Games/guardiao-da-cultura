import "server-only";
import { serverEnv } from "../../env-server";
import type { Rate } from "../types";

/**
 * `{value, numerator, denominator}` for every rate the dashboard shows —
 * never an unqualified number (discovery §7's "the number is not
 * defensible to an auditor" mitigation, and issue #742's own rule).
 * `safeRate(0, 0)` is `0`, not `NaN`; `value` is always clamped to
 * `[0, 1]` — the entry rate specifically *will* exceed 100% because
 * `landing_page_viewed` only fires on `/` while `/game` is linkable
 * direct, per #742's own note, so the clamp is load-bearing, not
 * defensive-only.
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
 * step N+1 can never exceed step N. HogQL's `windowFunnel` already
 * guarantees this by construction; this is the defensive clamp for the
 * documented fallback (`uniqExactIf`-based, if #739(a) says
 * `windowFunnel` isn't available) or a data glitch. Clamping down (never
 * up) means the auditor-facing number is always the conservative one.
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

/**
 * Module-level cache + single-flight for query results, keyed by an
 * arbitrary string (real callers key by `(query, from, to, slug)`, per
 * issue #742). This correctness does NOT depend on replica count — the
 * compose files confirm exactly one front replica today (discovery
 * §5.4) — but it is correct-per-process even if that changes; it would
 * just stop deduping *across* processes. `refresh: "blocking"` in
 * hogql.ts is what actually keeps load sane either way, and is the
 * documented reason a module cache is acceptable to ship despite the
 * multi-replica caveat: "Confirmar a contagem de réplicas antes de
 * calibrar o TTL" — done, it's one (#743).
 */
interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  inflight?: Promise<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: a heterogeneous cache keyed
// by caller-chosen strings necessarily holds values of different types.
const cache = new Map<string, CacheEntry<any>>();

/**
 * Hard cap on the number of cached keys — issue #742: "com teto de
 * tamanho, para ciclar parâmetros de data não crescer a memória." Keys
 * are `(query, from, to, slug)` tuples; a custom date range means the key
 * space is unbounded in principle, so the cap (not just the TTL) is what
 * actually bounds memory. Evicts the oldest inserted entry — Map
 * preserves insertion order, so the first key is the eviction candidate.
 */
export const MAX_CACHE_ENTRIES = 200;

function evictOldestIfOverCapacity(): void {
  while (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
}

export interface WithCacheOptions {
  /** Defaults to serverEnv.server.editalQueryCacheTtlMs. */
  ttlMs?: number;
}

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: WithCacheOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? serverEnv.server.editalQueryCacheTtlMs;
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing?.inflight) {
    // Single-flight: a second concurrent identical call joins the request
    // already in progress instead of issuing its own upstream call. "N
    // abas montando ao mesmo tempo geram uma chamada upstream" (#742).
    return existing.inflight;
  }

  if (existing && existing.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  const inflight = fn()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      evictOldestIfOverCapacity();
      return value;
    })
    .catch((err) => {
      // Never cache a failure — the next call should retry, not replay
      // the same error for the rest of the TTL.
      cache.delete(key);
      throw err;
    });

  cache.set(key, { expiresAt: now, inflight });
  evictOldestIfOverCapacity();
  return inflight;
}

/** Test-only: clears the module-level cache between test cases. */
export function __resetQueryCacheForTests(): void {
  cache.clear();
}
