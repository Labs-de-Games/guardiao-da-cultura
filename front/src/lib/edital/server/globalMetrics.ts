import "server-only";
import { safeRate } from "../rate";
import type { Rate } from "../types";
import {
  buildGlobalCompletionRateQuery,
  buildGlobalEntryRateQuery,
  buildGlobalOriginSplitQuery,
  buildGlobalPhaseCompletionQuery,
  buildGlobalPhaseProgressionQuery,
  buildGlobalPhaseQuizPassRateQuery,
  buildGlobalPhaseReachedQuery,
  buildGlobalPlayersQuery,
  buildGlobalPlayerTrendQuery,
  buildGlobalSessionDurationQuery,
  buildInstitutionCountQuery,
  buildTurmaCountQuery,
} from "./globalQueries";
import { runHogQLQuery } from "./hogql";
import { FINAL_LEVEL_NUMBER, ORDERED_LEVELS } from "./levels";
import { withCache } from "./metrics";
import { toNumber } from "./numeric";
import type { ResolvedDateRange } from "./period";
import { rowsToLevelMap } from "./rows";

/**
 * Issue #808 — global (cross-institution) metric orchestration, sibling
 * to metrics.ts for the same reason globalQueries.ts is a sibling to
 * queries.ts: every fetch* in metrics.ts takes a `Scope` and is trusted
 * to filter to one institution; these never do. `withCache` (metrics.ts)
 * is reused as-is — it's already scope-agnostic, just keyed by a string —
 * but every cache key here is prefixed `global:` so it can never collide
 * with an institution-scoped entry.
 */

function rangeKey(range: ResolvedDateRange): string {
  return `${range.from.toISOString()}:${range.to.toISOString()}`;
}

/** #808 P0 card 1 — jogadores únicos totais. */
export async function fetchGlobalPlayers(
  range: ResolvedDateRange,
): Promise<number> {
  const key = `global:players:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalPlayersQuery(range);
    const result = await runHogQLQuery(query, values);
    const [players] = result.results[0] ?? [0];
    return toNumber(players);
  });
}

/** #808 P0 card 2 — instituições ativas. */
export async function fetchInstitutionCount(
  range: ResolvedDateRange,
): Promise<number> {
  const key = `global:institutions:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildInstitutionCountQuery(range);
    const result = await runHogQLQuery(query, values);
    const [institutions] = result.results[0] ?? [0];
    return toNumber(institutions);
  });
}

/** #808 P0 card 3 — turmas/links ativos. */
export async function fetchTurmaCount(
  range: ResolvedDateRange,
): Promise<number> {
  const key = `global:turmas:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildTurmaCountQuery(range);
    const result = await runHogQLQuery(query, values);
    const [turmas] = result.results[0] ?? [0];
    return toNumber(turmas);
  });
}

/** #808 P0 — taxa geral de conclusão. */
export async function fetchGlobalCompletionRate(
  range: ResolvedDateRange,
): Promise<Rate> {
  const key = `global:completion-rate:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalCompletionRateQuery(
      range,
      FINAL_LEVEL_NUMBER,
    );
    const result = await runHogQLQuery(query, values);
    const [started, completed] = result.results[0] ?? [0, 0];
    return safeRate(toNumber(completed), toNumber(started));
  });
}

/** Taxa de entrada na gameplay — reference's "Desempenho" section. */
export async function fetchGlobalEntryRate(
  range: ResolvedDateRange,
): Promise<Rate> {
  const key = `global:entry-rate:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalEntryRateQuery(range);
    const result = await runHogQLQuery(query, values);
    const [landingPageViewed, gameplayStarted] = result.results[0] ?? [0, 0];
    return safeRate(toNumber(gameplayStarted), toNumber(landingPageViewed));
  });
}

export interface GlobalPhaseProgressionStep {
  label: string;
  players: number;
}

/** #808 P0 — progressão agregada: Iniciaram → Fase 1 → Fase 2 → Fase 3. */
export async function fetchGlobalPhaseProgression(
  range: ResolvedDateRange,
): Promise<GlobalPhaseProgressionStep[]> {
  const key = `global:phase-progression:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalPhaseProgressionQuery(range);
    const result = await runHogQLQuery(query, values);
    const row = result.results[0] ?? [];
    const values_: Record<string, number> = {};
    result.columns.forEach((column, index) => {
      values_[column] = toNumber(row[index]);
    });

    return [
      { label: "Iniciaram o jogo", players: values_.started ?? 0 },
      ...ORDERED_LEVELS.map((level) => ({
        label: `Concluíram Fase ${level.levelNumber}`,
        players: values_[`level_${level.levelNumber}_completed`] ?? 0,
      })),
    ];
  });
}

export interface GlobalPhaseDetail {
  levelId: string;
  levelNumber: number;
  label: string;
  /** Unique players who reached this level (game_started). */
  reached: number;
  /** Unique players who completed this level (level_completed). */
  completed: number;
  quizPassRate: Rate;
}

/**
 * Per-level detail for the "Desempenho por nível" switcher panel
 * (reference's "Desempenho por etapa"): reached/completed counts plus
 * quiz pass rate, one entry per real level — never a single blended
 * "capítulo 1" panel like the reference, since the game has 3 levels,
 * not one chapter.
 */
export async function fetchGlobalPhaseDetail(
  range: ResolvedDateRange,
): Promise<GlobalPhaseDetail[]> {
  const key = `global:phase-detail:${rangeKey(range)}`;
  return withCache(key, async () => {
    const reachedPlan = buildGlobalPhaseReachedQuery(range);
    const completedPlan = buildGlobalPhaseCompletionQuery(range);
    const quizPlan = buildGlobalPhaseQuizPassRateQuery(range);
    const [reachedResult, completedResult, quizResult] = await Promise.all([
      runHogQLQuery(reachedPlan.query, reachedPlan.values),
      runHogQLQuery(completedPlan.query, completedPlan.values),
      runHogQLQuery(quizPlan.query, quizPlan.values),
    ]);

    const reachedByLevel = rowsToLevelMap(reachedResult.results, (row) =>
      toNumber(row[1]),
    );
    const completedByLevel = rowsToLevelMap(completedResult.results, (row) =>
      toNumber(row[1]),
    );
    const quizByLevel = rowsToLevelMap(quizResult.results, (row) => ({
      passed: toNumber(row[1]),
      total: toNumber(row[2]),
    }));

    return ORDERED_LEVELS.map((level) => {
      const quiz = quizByLevel.get(level.id);
      return {
        levelId: level.id,
        levelNumber: level.levelNumber,
        label: level.title,
        reached: reachedByLevel.get(level.id) ?? 0,
        completed: completedByLevel.get(level.id) ?? 0,
        quizPassRate: safeRate(quiz?.passed ?? 0, quiz?.total ?? 0),
      };
    });
  });
}

export interface GlobalOriginSplit {
  institutional: number;
  spontaneous: number;
}

/** #808 P1 — origem institucional × espontânea. */
export async function fetchGlobalOriginSplit(
  range: ResolvedDateRange,
): Promise<GlobalOriginSplit> {
  const key = `global:origin-split:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalOriginSplitQuery(range);
    const result = await runHogQLQuery(query, values);
    const [institutional, spontaneous] = result.results[0] ?? [0, 0];
    return {
      institutional: toNumber(institutional),
      spontaneous: toNumber(spontaneous),
    };
  });
}

export interface GlobalPlayerTrendPoint {
  month: string;
  players: number;
}

/** #808 P1 — evolução de jogadores ao longo do tempo, mensal. */
export async function fetchGlobalPlayerTrend(
  range: ResolvedDateRange,
): Promise<GlobalPlayerTrendPoint[]> {
  const key = `global:player-trend:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalPlayerTrendQuery(range);
    const result = await runHogQLQuery(query, values);
    return result.results.map((row) => {
      const [month, players] = row as [string, number];
      return { month, players: toNumber(players) };
    });
  });
}

export interface GlobalSessionDuration {
  avgSeconds: number;
  medianSeconds: number;
  sessionsStarted: number;
}

/** Sessões iniciadas / Tempo médio de sessão (reference's "Alcance" side cards). */
export async function fetchGlobalSessionDuration(
  range: ResolvedDateRange,
): Promise<GlobalSessionDuration> {
  const key = `global:session-duration:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalSessionDurationQuery(range);
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
