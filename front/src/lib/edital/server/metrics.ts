import "server-only";
import { serverEnv } from "../../env-server";
import type { Rate } from "../types";

/**
 * Module-level cache + single-flight for query results, keyed by an
 * arbitrary string (a real caller keys by scope + query + date range).
 * Per issue #742's file map, this orchestration (cache, single-flight)
 * belongs here, not in queries.ts (which holds only HogQL query
 * constants/builders) — moved here from queries.ts, where it was
 * originally and incorrectly filed.
 *
 * This correctness does NOT depend on replica count — the compose files
 * confirm exactly one front replica today (discovery §5.4), but this
 * cache would still be correct-per-process if that ever changed; it just
 * wouldn't dedupe *across* processes. `refresh: "blocking"` in hogql.ts
 * is what actually keeps load sane either way.
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
 * Size cap per issue #742: "com teto de tamanho, para ciclar parâmetros
 * de data não crescer a memória" — without this, cycling through many
 * distinct (query, from, to, slug) keys (e.g. a user paging through date
 * ranges) would grow the map unbounded for the life of the process.
 */
const MAX_CACHE_ENTRIES = 200;

function evictOldestIfOverCapacity(): void {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  const oldestKey = cache.keys().next().value;
  if (oldestKey !== undefined) {
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
    // already in progress instead of issuing its own upstream call.
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

/** Test-only: reads the current cache size. */
export function __getQueryCacheSizeForTests(): number {
  return cache.size;
}

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
