import "server-only";
import { LEVEL_REGISTRY } from "../../../game/data/LevelConfig";
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
import { withCache } from "./metrics";
import type { ResolvedDateRange } from "./period";

/**
 * Issue #808 — global (cross-institution) metric orchestration, sibling
 * to metrics.ts for the same reason globalQueries.ts is a sibling to
 * queries.ts: every fetch* in metrics.ts takes a `Scope` and is trusted
 * to filter to one institution; these never do. `withCache` (metrics.ts)
 * is reused as-is — it's already scope-agnostic, just keyed by a string —
 * but every cache key here is prefixed `global:` so it can never collide
 * with an institution-scoped entry.
 */

const ORDERED_LEVELS = Object.values(LEVEL_REGISTRY).sort(
  (a, b) => a.levelNumber - b.levelNumber,
);
const FINAL_LEVEL_NUMBER =
  ORDERED_LEVELS[ORDERED_LEVELS.length - 1]?.levelNumber ?? 1;

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
    return Number(players ?? 0);
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
    return Number(institutions ?? 0);
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
    return Number(turmas ?? 0);
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
    return safeRate(Number(completed ?? 0), Number(started ?? 0));
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
    return safeRate(
      Number(gameplayStarted ?? 0),
      Number(landingPageViewed ?? 0),
    );
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
      values_[column] = Number(row[index] ?? 0);
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

export interface GlobalPhaseQuizPassRate {
  levelId: string;
  levelNumber: number;
  label: string;
  rate: Rate;
}

/** #808 P0 — aprovação agregada nos quizzes, por fase. */
export async function fetchGlobalPhaseQuizPassRate(
  range: ResolvedDateRange,
): Promise<GlobalPhaseQuizPassRate[]> {
  const key = `global:phase-quiz-pass-rate:${rangeKey(range)}`;
  return withCache(key, async () => {
    const { query, values } = buildGlobalPhaseQuizPassRateQuery(range);
    const result = await runHogQLQuery(query, values);
    const byLevel = new Map<string, { passed: number; total: number }>();
    for (const row of result.results) {
      const [levelId, passed, total] = row as [string, number, number];
      byLevel.set(levelId, {
        passed: Number(passed ?? 0),
        total: Number(total ?? 0),
      });
    }

    return ORDERED_LEVELS.map((level) => {
      const entry = byLevel.get(level.id);
      return {
        levelId: level.id,
        levelNumber: level.levelNumber,
        label: level.title,
        rate: safeRate(entry?.passed ?? 0, entry?.total ?? 0),
      };
    });
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

    const reachedByLevel = new Map<string, number>();
    for (const row of reachedResult.results) {
      const [levelId, players] = row as [string, number];
      reachedByLevel.set(levelId, Number(players ?? 0));
    }
    const completedByLevel = new Map<string, number>();
    for (const row of completedResult.results) {
      const [levelId, players] = row as [string, number];
      completedByLevel.set(levelId, Number(players ?? 0));
    }
    const quizByLevel = new Map<string, { passed: number; total: number }>();
    for (const row of quizResult.results) {
      const [levelId, passed, total] = row as [string, number, number];
      quizByLevel.set(levelId, {
        passed: Number(passed ?? 0),
        total: Number(total ?? 0),
      });
    }

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
      institutional: Number(institutional ?? 0),
      spontaneous: Number(spontaneous ?? 0),
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
      return { month, players: Number(players ?? 0) };
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
      avgSeconds: Number(avgSeconds ?? 0),
      medianSeconds: Number(medianSeconds ?? 0),
      sessionsStarted: Number(sessionsStarted ?? 0),
    };
  });
}
