import "server-only";
import { serverEnv } from "../../env-server";
import { safeRate } from "../rate";
import type { Rate } from "../types";
import { runHogQLQuery } from "./hogql";
import type { ResolvedDateRange } from "./period";
import {
  buildCampaignsQuery,
  buildCriticalErrorsQuery,
  buildFunnelQuery,
  buildQuizPassRateQuery,
  buildSessionDurationQuery,
  buildSummaryQuery,
  FUNNEL_EVENTS,
} from "./queries";
import type { Scope } from "./scope";

// safeRate moved to ../rate.ts (client-safe — Screen 1's client-computed
// entry-rate/chapter-1-completion-rate cards need it without importing
// anything under server/). Re-exported here for existing call sites.
export { safeRate };

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

/** Test-only: reads the current cache size. */
export function __getQueryCacheSizeForTests(): number {
  return cache.size;
}

function rangeKey(range: ResolvedDateRange): string {
  return `${range.from.toISOString()}:${range.to.toISOString()}`;
}

/** Q1 orchestration: unique-player count per canonical funnel event. */
export async function fetchSummary(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<Record<string, number>> {
  const key = `summary:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildSummaryQuery(scope, range);
    const result = await runHogQLQuery(query, values);
    const row = result.results[0] ?? [];
    const record: Record<string, number> = {};
    result.columns.forEach((column, index) => {
      record[column] = Number(row[index] ?? 0);
    });
    return record;
  });
}

/**
 * Q4 orchestration: `windowFunnel`'s per-person "depth reached" histogram
 * converted into "at least N steps reached" cumulative counts (depth >=
 * step index), then run through `clampMonotonicFunnel` as the defensive
 * floor — `windowFunnel` already guarantees monotonicity, this just
 * makes it structurally impossible for a bug here to violate it too.
 */
export async function fetchFunnel(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<Array<{ label: string; value: number }>> {
  const key = `funnel:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildFunnelQuery(scope, range);
    const result = await runHogQLQuery(query, values);

    const playersByDepth = new Map<number, number>();
    for (const row of result.results) {
      const [depth, players] = row as [number, number];
      playersByDepth.set(depth, players);
    }

    const rawCounts = FUNNEL_EVENTS.map((_label, index) => {
      const stepNumber = index + 1;
      let reached = 0;
      for (const [depth, players] of playersByDepth) {
        if (depth >= stepNumber) reached += players;
      }
      return reached;
    });

    const clamped = clampMonotonicFunnel(rawCounts);
    return FUNNEL_EVENTS.map((label, index) => ({
      label,
      value: clamped[index],
    }));
  });
}

/**
 * Q2 orchestration: average/median session duration in seconds, plus
 * `sessionsStarted` — issue #745's card 2, a session count (not a
 * unique-player count, unlike card 1).
 */
export async function fetchSessionDuration(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<{
  avgSeconds: number;
  medianSeconds: number;
  sessionsStarted: number;
}> {
  const key = `session-duration:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildSessionDurationQuery(scope, range);
    const result = await runHogQLQuery(query, values);
    const [avgSeconds, medianSeconds, sessionsStarted] = result.results[0] ?? [
      0, 0, 0,
    ];
    return {
      avgSeconds: Number(avgSeconds ?? 0),
      medianSeconds: Number(medianSeconds ?? 0),
      sessionsStarted: Number(sessionsStarted ?? 0),
    };
  });
}

/** Card 7 orchestration: per-attempt quiz pass rate as {value, numerator, denominator}. */
export async function fetchQuizPassRate(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<Rate> {
  const key = `quiz-pass-rate:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildQuizPassRateQuery(scope, range);
    const result = await runHogQLQuery(query, values);
    const [passed, total] = result.results[0] ?? [0, 0];
    return safeRate(Number(passed ?? 0), Number(total ?? 0));
  });
}

/** Q3 orchestration: total critical errors + breakdown by error_code. */
export async function fetchCriticalErrors(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<{ total: number; byErrorCode: Record<string, number> }> {
  const key = `critical-errors:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildCriticalErrorsQuery(scope, range);
    const result = await runHogQLQuery(query, values);
    const byErrorCode: Record<string, number> = {};
    let total = 0;
    for (const row of result.results) {
      const [errorCode, count] = row as [string | null, number];
      const codeKey = errorCode ?? "unknown";
      const value = Number(count ?? 0);
      byErrorCode[codeKey] = value;
      total += value;
    }
    return { total, byErrorCode };
  });
}

/** Campaigns orchestration (#746) — see queries.ts's buildCampaignsQuery. */
export async function fetchCampaigns(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<{ uniquePlayers: number }> {
  const key = `campaigns:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildCampaignsQuery(scope, range);
    const result = await runHogQLQuery(query, values);
    const [uniquePlayers] = result.results[0] ?? [0];
    return { uniquePlayers: Number(uniquePlayers ?? 0) };
  });
}
