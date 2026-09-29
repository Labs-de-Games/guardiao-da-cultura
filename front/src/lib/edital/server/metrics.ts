import "server-only";
import { serverEnv } from "../../env-server";
import { safeRate } from "../rate";
import type { PhaseStars, Rate } from "../types";
import { runHogQLQuery } from "./hogql";
import { DASHBOARD_LEVELS } from "./levels";
import { toNumber } from "./numeric";
import type { ResolvedDateRange } from "./period";
import {
  buildCampaignsQuery,
  buildCompletionRateQuery,
  buildFunnelQuery,
  buildPhaseClueUsageQuery,
  buildPhaseCompletionQuery,
  buildPhaseQuizPassRateQuery,
  buildPhaseReachedQuery,
  buildPhaseStarsQuery,
  buildQuizPassRateQuery,
  buildSessionDurationQuery,
  buildSummaryQuery,
  getFunnelSteps,
} from "./queries";
import { rowsToLevelMap } from "./rows";
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

// biome-ignore lint/suspicious/noExplicitAny: heterogeneous cache
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

/**
 * Cache key suffix shared by every fetch* below — includes `turmaSource`
 * (issue #807) so an institution-wide result and a turma-scoped result
 * for the same institution/range never collide in the module cache.
 */
function scopeKey(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): string {
  return `${scope.slug}:${turmaSource ?? "*"}:${rangeKey(range)}`;
}

/** Q1 orchestration: unique-player count per canonical funnel event. */
export async function fetchSummary(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<Record<string, number>> {
  const key = `summary:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildSummaryQuery(scope, range, turmaSource);
    const result = await runHogQLQuery(query, values);
    const row = result.results[0] ?? [];
    const record: Record<string, number> = {};
    result.columns.forEach((column, index) => {
      record[column] = toNumber(row[index]);
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
  turmaSource?: string,
): Promise<Array<{ label: string; value: number }>> {
  const key = `funnel:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildFunnelQuery(scope, range, turmaSource);
    const result = await runHogQLQuery(query, values);

    const playersByDepth = new Map<number, number>();
    for (const row of result.results) {
      const [depth, players] = row as [number, number];
      playersByDepth.set(depth, players);
    }

    const steps = getFunnelSteps();
    const rawCounts = steps.map((_step, index) => {
      const stepNumber = index + 1;
      let reached = 0;
      for (const [depth, players] of playersByDepth) {
        if (depth >= stepNumber) reached += players;
      }
      return reached;
    });

    const clamped = clampMonotonicFunnel(rawCounts);
    return steps.map((step, index) => ({
      label: step.label,
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
  turmaSource?: string,
): Promise<{
  avgSeconds: number;
  medianSeconds: number;
  sessionsStarted: number;
}> {
  const key = `session-duration:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildSessionDurationQuery(
      scope,
      range,
      turmaSource,
    );
    const result = await runHogQLQuery(query, values);
    const [avgSeconds, medianSeconds, sessionsStarted] = result.results[0] ?? [
      0, 0, 0,
    ];
    return {
      avgSeconds: toNumber(avgSeconds),
      medianSeconds: toNumber(medianSeconds),
      sessionsStarted: toNumber(sessionsStarted),
    };
  });
}

/** Card 7 orchestration: per-attempt quiz pass rate as {value, numerator, denominator}. */
export async function fetchQuizPassRate(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<Rate> {
  const key = `quiz-pass-rate:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildQuizPassRateQuery(scope, range, turmaSource);
    const result = await runHogQLQuery(query, values);
    const [passed, total] = result.results[0] ?? [0, 0];
    return safeRate(toNumber(passed), toNumber(total));
  });
}

export interface CampaignOriginBreakdown {
  source: string;
  uniquePlayers: number;
}

/**
 * Campaigns orchestration (#746) — a real per-utm_source breakdown for
 * the caller's own institution slug, not a single total. Not
 * turma-filtered — see buildCampaignsQuery's doc comment.
 */
export async function fetchCampaigns(
  scope: Scope,
  range: ResolvedDateRange,
): Promise<CampaignOriginBreakdown[]> {
  const key = `campaigns:${scope.slug}:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildCampaignsQuery(scope, range);
    const result = await runHogQLQuery(query, values);
    return result.results.map((row) => {
      const [source, uniquePlayers] = row as [string, number];
      return { source, uniquePlayers: toNumber(uniquePlayers) };
    });
  });
}

/** #807 completion rate — institution-wide when `turmaSource` is absent, turma-scoped otherwise. */
export async function fetchCompletionRate(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<Rate> {
  const key = `completion-rate:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildCompletionRateQuery(
      scope,
      range,
      turmaSource,
    );
    const result = await runHogQLQuery(query, values);
    const [started, completed] = result.results[0] ?? [0, 0];
    return safeRate(toNumber(completed), toNumber(started));
  });
}

export interface PhaseBreakdown {
  levelId: string;
  levelNumber: number;
  label: string;
  /** Unique players who entered this level (`game_started` / `investigation_opened`). */
  reached: number;
  /** Unique players who finished this level (`level_completed` / `investigation_completed`). */
  completed: number;
}

export interface PhaseQuizPassRateBreakdown {
  levelId: string;
  levelNumber: number;
  label: string;
  rate: Rate;
}

export interface PhaseClueUsageBreakdown {
  levelId: string;
  levelNumber: number;
  label: string;
  clues: number;
}

export interface PhaseStarsBreakdown extends PhaseStars {
  levelId: string;
  levelNumber: number;
  label: string;
}

/** HogQL stars rows → `PhaseStars` per level id. Shared with globalMetrics.ts. */
export function rowsToStarsMap(rows: unknown[][]): Map<string, PhaseStars> {
  return rowsToLevelMap(rows, (row) => ({
    avgStars: toNumber(row[1]),
    players: toNumber(row[2]),
  }));
}

export const EMPTY_PHASE_STARS: PhaseStars = { avgStars: 0, players: 0 };

/**
 * Every level in DASHBOARD_LEVELS (1–4), in order — the base
 * every phase breakdown starts from, so a level with zero events for the
 * selected period still shows up as a zero row instead of silently
 * disappearing from a `GROUP BY` result that only returns levels with at
 * least one matching event.
 */
function allLevelsBase(levels = DASHBOARD_LEVELS): Array<{
  levelId: string;
  levelNumber: number;
  label: string;
}> {
  return levels.map((level) => ({
    levelId: level.id,
    levelNumber: level.levelNumber,
    label: level.title,
  }));
}

/**
 * #807 "progresso por fase" — reached and completed per level, one row
 * per level in DASHBOARD_LEVELS always present, even at zero, ordered by
 * level number.
 * Institution-wide when `turmaSource` is absent, turma-scoped otherwise.
 */
export async function fetchPhaseProgress(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<PhaseBreakdown[]> {
  const key = `phase-progress:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const reachedPlan = buildPhaseReachedQuery(scope, range, turmaSource);
    const completedPlan = buildPhaseCompletionQuery(scope, range, turmaSource);
    const [reachedResult, completedResult] = await Promise.all([
      runHogQLQuery(reachedPlan.query, reachedPlan.values),
      runHogQLQuery(completedPlan.query, completedPlan.values),
    ]);

    const reachedByLevel = rowsToLevelMap(reachedResult.results, (row) =>
      toNumber(row[1]),
    );
    const completedByLevel = rowsToLevelMap(completedResult.results, (row) =>
      toNumber(row[1]),
    );

    return allLevelsBase()
      .map((level) => ({
        ...level,
        reached: reachedByLevel.get(level.levelId) ?? 0,
        completed: completedByLevel.get(level.levelId) ?? 0,
      }))
      .sort((a, b) => a.levelNumber - b.levelNumber);
  });
}

/**
 * #807 "taxa de aprovação nos quizzes por fase" — per-level pass rate,
 * one row per level that ends in a quiz always present, ordered by level
 * number. The investigation has no quiz, so it has no row here rather
 * than a misleading 0%. Institution-wide when `turmaSource` is absent,
 * turma-scoped otherwise.
 */
export async function fetchPhaseQuizPassRate(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<PhaseQuizPassRateBreakdown[]> {
  const key = `phase-quiz-pass-rate:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildPhaseQuizPassRateQuery(
      scope,
      range,
      turmaSource,
    );
    const result = await runHogQLQuery(query, values);
    const byLevel = rowsToLevelMap(result.results, (row) => ({
      passed: toNumber(row[1]),
      total: toNumber(row[2]),
    }));

    return allLevelsBase(DASHBOARD_LEVELS.filter((level) => level.hasQuiz))
      .map((level) => {
        const entry = byLevel.get(level.levelId);
        return {
          ...level,
          rate: safeRate(entry?.passed ?? 0, entry?.total ?? 0),
        };
      })
      .sort((a, b) => a.levelNumber - b.levelNumber);
  });
}

/**
 * #807 P1 "pistas por fase" — raw clue count per level (collected in
 * levels 1–3, placed on the board in level 4), one row per level in
 * DASHBOARD_LEVELS always present, ordered by level number.
 * Institution-wide when `turmaSource` is absent, turma-scoped otherwise.
 */
export async function fetchPhaseClueUsage(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<PhaseClueUsageBreakdown[]> {
  const key = `phase-clue-usage:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildPhaseClueUsageQuery(
      scope,
      range,
      turmaSource,
    );
    const result = await runHogQLQuery(query, values);
    const byLevel = rowsToLevelMap(result.results, (row) => toNumber(row[1]));

    return allLevelsBase()
      .map((level) => ({
        ...level,
        clues: byLevel.get(level.levelId) ?? 0,
      }))
      .sort((a, b) => a.levelNumber - b.levelNumber);
  });
}

/**
 * Stars per level — each player's best run, averaged — one row per level
 * in DASHBOARD_LEVELS always present, ordered by level number.
 * Institution-wide when `turmaSource` is absent, turma-scoped otherwise.
 */
export async function fetchPhaseStars(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): Promise<PhaseStarsBreakdown[]> {
  const key = `phase-stars:${scopeKey(scope, range, turmaSource)}`;
  return withCache(key, async () => {
    const { query, values } = buildPhaseStarsQuery(scope, range, turmaSource);
    const result = await runHogQLQuery(query, values);
    const byLevel = rowsToStarsMap(result.results);

    return allLevelsBase()
      .map((level) => ({
        ...level,
        ...(byLevel.get(level.levelId) ?? EMPTY_PHASE_STARS),
      }))
      .sort((a, b) => a.levelNumber - b.levelNumber);
  });
}
