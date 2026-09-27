import "server-only";
import { environmentPredicate, environmentValues } from "./environmentScope";
import { ORDERED_LEVELS } from "./levels";
import type { ResolvedDateRange } from "./period";
import type { HogQLQueryPlan } from "./queries";

/**
 * Issue #808 — the public dashboard's queries, deliberately a sibling
 * file to queries.ts rather than an edit to it: every builder there takes
 * a `Scope` and is trusted (by every reviewer and by #742's own rule) to
 * always filter to one institution. Mixing an unscoped builder into that
 * file would make "does this leak cross-institution data" a per-function
 * question instead of a per-file one. These builders NEVER take a
 * `Scope` or a `turmaSource` — #808's whole point is aggregate-across-
 * everyone, no institution/turma filter, ever.
 */

/**
 * Same shape as queries.ts's commonPredicate, minus the institution filter
 * — including the per-deployment narrowing (environmentScope.ts).
 */
function commonGlobalPredicate(): string {
  return `timestamp >= toDateTime({from_ts}) AND timestamp < toDateTime({to_ts}) AND properties.anonymous_player_id IS NOT NULL AND properties.anonymous_player_id != '' AND ${environmentPredicate()}`;
}

function baseValues(range: ResolvedDateRange) {
  return {
    ...environmentValues(),
    from_ts: range.from.toISOString(),
    to_ts: range.to.toISOString(),
  };
}

/** Jogadores únicos totais (#808 P0 card 1). */
export function buildGlobalPlayersQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started') AS players
FROM events
WHERE ${commonGlobalPredicate()}`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Taxa de entrada na gameplay (reference's "Desempenho" section) —
 * gameplay_started / landing_page_viewed, same formula the institution
 * dashboard already uses (institution/page.tsx's `safeRate` call), just
 * unscoped.
 */
export function buildGlobalEntryRateQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  uniqExactIf(properties.anonymous_player_id, event = 'landing_page_viewed') AS landing_page_viewed,
  uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started') AS gameplay_started
FROM events
WHERE ${commonGlobalPredicate()}`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Instituições ativas (#808 P0 card 2) — distinct non-empty
 * `campaign_source` values, the institution slug set on every event by
 * `applyFirstTouchCampaignSource` (campaign.ts) whenever a player arrived
 * via an institution's `?utm_institution=` link.
 */
export function buildInstitutionCountQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT uniqExact(properties.campaign_source) AS institutions
FROM events
WHERE ${commonGlobalPredicate()} AND coalesce(properties.campaign_source, '') != ''`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Turmas/links ativos (#808 P0 card 3) — distinct non-empty
 * `turma_source` values (campaign.ts's `applyFirstTouchTurmaSource`).
 */
export function buildTurmaCountQuery(range: ResolvedDateRange): HogQLQueryPlan {
  const query = `
SELECT uniqExact(properties.turma_source) AS turmas
FROM events
WHERE ${commonGlobalPredicate()} AND coalesce(properties.turma_source, '') != ''`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Taxa geral de conclusão (#808 P0) — same started/completed shape as
 * queries.ts's buildCompletionRateQuery, unscoped.
 */
export function buildGlobalCompletionRateQuery(
  range: ResolvedDateRange,
  finalLevelNumber: number,
): HogQLQueryPlan {
  const query = `
SELECT
  uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started') AS started,
  uniqExactIf(properties.anonymous_player_id, event = 'level_completed' AND toInt(properties.level_number) = {final_level_number}) AS completed
FROM events
WHERE ${commonGlobalPredicate()}`.trim();

  return {
    query,
    values: { ...baseValues(range), final_level_number: finalLevelNumber },
  };
}

/**
 * Progressão agregada por fase (#808 P0) — "Iniciaram → Concluíram Fase
 * 1 → Fase 2 → Fase 3", one row, one column per step. Deliberately plain
 * `uniqExactIf` per step (not `windowFunnel`'s strict ordering): #808
 * asks for "distribuição dos jogadores ao longo das fases", not the
 * institution dashboard's strict-order acquisition funnel.
 */
export function buildGlobalPhaseProgressionQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const stepSelects = [
    `uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started') AS started`,
    ...ORDERED_LEVELS.map(
      (level) =>
        `uniqExactIf(properties.anonymous_player_id, event = 'level_completed' AND toInt(properties.level_number) = ${level.levelNumber}) AS level_${level.levelNumber}_completed`,
    ),
  ].join(",\n  ");

  const query = `
SELECT
  ${stepSelects}
FROM events
WHERE ${commonGlobalPredicate()}`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Aprovação agregada nos quizzes — por fase (#808 P0), unscoped. Only a
 * per-level breakdown exists here, deliberately — a single blended rate
 * across all 3 levels' quizzes would misrepresent 3 genuinely different
 * quizzes as one, same reasoning as the institution dashboard's
 * Relatório page dropping its own single "Aprovação no quiz" row for a
 * per-fase breakdown.
 */
export function buildGlobalPhaseQuizPassRateQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  countIf(event = 'quiz_completed' AND toBool(properties.passed)) AS passed,
  countIf(event = 'quiz_completed') AS total
FROM events
WHERE ${commonGlobalPredicate()}
GROUP BY level_id`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Per-level "reached" count (queries.ts's buildPhaseReachedQuery,
 * unscoped) — unique players who entered each level, via `game_started`
 * (fires every level entry, carries `level_id`). Paired with
 * buildGlobalPhaseCompletionQuery below to compute a per-level
 * completion rate for the level-switcher panel.
 */
export function buildGlobalPhaseReachedQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  uniqExact(properties.anonymous_player_id) AS players
FROM events
WHERE ${commonGlobalPredicate()} AND event = 'game_started'
GROUP BY level_id`.trim();

  return { query, values: baseValues(range) };
}

/** Per-level "completed" count (queries.ts's buildPhaseCompletionQuery, unscoped). */
export function buildGlobalPhaseCompletionQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  uniqExact(properties.anonymous_player_id) AS players
FROM events
WHERE ${commonGlobalPredicate()} AND event = 'level_completed'
GROUP BY level_id`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Origem institucional × espontânea (#808 P1) — a session/player is
 * "institucional" iff it carries a non-empty `campaign_source`
 * (first-touch `?utm_institution=`); everything else is "espontânea"
 * (direct access to the game, no institution link).
 *
 * `campaign_source` is simply never set without a link, so it reads as
 * NULL — and HogQL's null-safe comparisons make `NULL != ''` true and
 * `NULL = ''` false, which counted every no-link player as institutional.
 * `coalesce(…, '')` folds NULL into "no link" for every optional-property
 * comparison in this file.
 */
export function buildGlobalOriginSplitQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started' AND coalesce(properties.campaign_source, '') != '') AS institutional,
  uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started' AND coalesce(properties.campaign_source, '') = '') AS spontaneous
FROM events
WHERE ${commonGlobalPredicate()}`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Evolução de jogadores ao longo do tempo (#808 P1) — monthly-bucketed
 * unique players, unscoped. `toStartOfMonth` per São Paulo civil time
 * isn't needed here (this is a coarse trend chart, not an auditor-facing
 * boundary like period.ts's day clamps) — HogQL's default UTC bucketing
 * is precise enough for a monthly trend line.
 */
export function buildGlobalPlayerTrendQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  toStartOfMonth(timestamp) AS month,
  uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started') AS players
FROM events
WHERE ${commonGlobalPredicate()}
GROUP BY month
ORDER BY month`.trim();

  return { query, values: baseValues(range) };
}

/**
 * Sessões iniciadas / Tempo médio de sessão (#808 reference's "Alcance"
 * side cards) — same shape as queries.ts's buildSessionDurationQuery,
 * unscoped.
 */
export function buildGlobalSessionDurationQuery(
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  avg(duration_seconds) AS avg_seconds,
  median(duration_seconds) AS median_seconds,
  count() AS sessions_started
FROM (
  SELECT
    properties.\`$session_id\` AS session_id,
    dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
  FROM events
  WHERE ${commonGlobalPredicate()}
  GROUP BY session_id
  HAVING countIf(event = 'gameplay_started') > 0
     AND duration_seconds BETWEEN 1 AND 14400
)`.trim();

  return { query, values: baseValues(range) };
}
