import "server-only";
import { LEVEL_REGISTRY } from "../../../game/data/LevelConfig";
import type { HogQLValues } from "./hogql";
import type { ResolvedDateRange } from "./period";
import type { Scope } from "./scope";

export interface HogQLQueryPlan {
  query: string;
  values: HogQLValues;
}

/**
 * Common predicate every query in this file starts from, verbatim from
 * issue #742: a timestamp window, a non-empty `anonymous_player_id`
 * (excludes rows from before #740 shipped identity — see discovery
 * §2.4), and the caller's own `campaign_source`. `{slug}`/`{from_ts}`/
 * `{to_ts}` are HogQL value placeholders, bound via `values` in
 * hogql.ts — never string-interpolated. The `slug` bound here must
 * already be `resolveScope`'d and ORIGIN_SLUG_PATTERN-validated by the
 * caller; this file trusts its `Scope` parameter, not a raw string.
 *
 * Every builder below also takes an optional `turmaSource` (issue #807)
 * — when present, an extra `AND properties.turma_source = {source}`
 * clause narrows the same query to one turma within the institution;
 * when absent, the query is institution-wide exactly as it was before
 * #807. This is a data-dimension filter, not a second tenancy boundary:
 * `turmaSource` only ever narrows an already-`resolveScope`'d
 * institution's own event set. `turma_source` is the first-touch
 * super-property from campaign.ts's `applyFirstTouchTurmaSource`, not
 * the raw last-touch `utm_source` `buildCampaignsQuery` uses — that
 * distinction is the actual fix #807 needed, not a stylistic choice.
 */
function commonPredicate(turmaSource?: string): string {
  const base = `timestamp >= toDateTime({from_ts}) AND timestamp < toDateTime({to_ts}) AND properties.anonymous_player_id IS NOT NULL AND properties.anonymous_player_id != '' AND properties.campaign_source = {slug}`;
  return turmaSource ? `${base} AND properties.turma_source = {source}` : base;
}

function baseValues(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLValues {
  const values: HogQLValues = {
    slug: scope.slug,
    from_ts: range.from.toISOString(),
    to_ts: range.to.toISOString(),
  };
  if (turmaSource) values.source = turmaSource;
  return values;
}

/**
 * Fixed fields Q1 (the summary cards) actually reads today: the HeroMetric
 * and "taxa de entrada na gameplay" card. Deliberately NOT the funnel's
 * own step list below — those used to be the same array (the "canonical
 * 7-step funnel"), but that coupling is what let the funnel silently stay
 * chapter-1-only: growing the funnel to cover every level would otherwise
 * have grown this list too, and `uniqExactIf` per *event name* can't
 * express "level_completed, but only level 2" the way the funnel's own
 * per-level conditions below can.
 */
const SUMMARY_FIELDS = ["landing_page_viewed", "gameplay_started"] as const;

export interface FunnelStepDef {
  /** Raw event name for the 3 acquisition steps; the level's title for level-completion steps. */
  label: string;
  condition: string;
}

/**
 * Acquisition — pre-gameplay, not per-level: a player either saw the
 * landing page, clicked play, and started gameplay, or didn't. No level
 * distinction applies yet at this point in the journey.
 */
const ACQUISITION_STEPS: FunnelStepDef[] = [
  { label: "landing_page_viewed", condition: "event = 'landing_page_viewed'" },
  { label: "play_clicked", condition: "event = 'play_clicked'" },
  { label: "gameplay_started", condition: "event = 'gameplay_started'" },
];

/**
 * One funnel step per real level (1, 2, 3 today), each requiring
 * `level_completed` with that level's own `level_number` — replaces the
 * old hardcoded `chapter_1_started`/`chapter_1_completed` pair, which
 * only ever covered level 1 (issue #807's explicit warning: "não
 * utilizar chapter_1_started/chapter_1_completed como base geral").
 * `levelNumber` is a compile-time constant from LEVEL_REGISTRY, not
 * request input, so interpolating it here is the same safe pattern as
 * the event-name literals above — never a user-controlled value.
 */
function levelCompletionSteps(): FunnelStepDef[] {
  return Object.values(LEVEL_REGISTRY)
    .sort((a, b) => a.levelNumber - b.levelNumber)
    .map((level) => ({
      label: `Concluiu Fase ${level.levelNumber} — ${level.title}`,
      condition: `event = 'level_completed' AND toInt(properties.level_number) = ${level.levelNumber}`,
    }));
}

/**
 * The full funnel, in order: acquisition steps, then one completion step
 * per level — dynamic on LEVEL_REGISTRY's length, so a 4th level added to
 * the game extends this funnel automatically instead of needing a new
 * hardcoded step.
 */
export function getFunnelSteps(): FunnelStepDef[] {
  return [...ACQUISITION_STEPS, ...levelCompletionSteps()];
}

/**
 * Q1 — one round trip, `uniqExactIf` per summary field. `uniqExact`, never
 * `uniq`: `uniq` is HyperLogLog with ~0.5% relative error — ±25 users on
 * a 5,000-user goal, on the one number the edital is judged by (issue
 * #742's own non-negotiable rule).
 */
export function buildSummaryQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const selects = SUMMARY_FIELDS.map(
    (name) =>
      `uniqExactIf(properties.anonymous_player_id, event = '${name}') AS ${name}`,
  ).join(",\n    ");

  return {
    query: `SELECT\n    ${selects}\nFROM events\nWHERE ${commonPredicate(turmaSource)}`,
    values: baseValues(scope, range, turmaSource),
  };
}

/**
 * Q4 — the full acquisition-through-every-level funnel via `windowFunnel`,
 * which gives strict ordering and monotonicity by construction (the first
 * thing an evaluator checks). `604800` is the 7-day window per issue
 * #742. Grouped by person: one funnel-depth value per
 * `anonymous_player_id`, then a histogram of how many players reached
 * each depth.
 *
 * Fallback if `windowFunnel` isn't available on this PostHog plan (see
 * #739(a), still unanswered as of this step) is documented but NOT
 * implemented here — implementing an alternate query for a hypothetical
 * "not available" response would be guessing at an API error shape
 * nothing has observed yet. If #739(a) comes back negative, this
 * function's body is what needs replacing with `buildFunnelFallbackQuery`
 * using `uniqExactIf` per step instead (weaker guarantee: "steps
 * reached", not strict order).
 *
 * #739(a) is answered: `windowFunnel` is available — but only over
 * `DateTime`, not the `events.timestamp` column's native
 * `DateTime64(6, 'UTC')` ("Illegal type DateTime64(6, 'UTC') of first
 * argument", confirmed directly against the PostHog Query API). Hence
 * the explicit `toDateTime(timestamp)` cast below; dropping it 400s.
 */
export function buildFunnelQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const stepConditions = getFunnelSteps()
    .map((step) => `(${step.condition})`)
    .join(",\n      ");

  const query = `
SELECT depth, count() AS players
FROM (
  SELECT
    properties.anonymous_player_id AS anonymous_player_id,
    windowFunnel(604800)(
      toDateTime(timestamp),
      ${stepConditions}
    ) AS depth
  FROM events
  WHERE ${commonPredicate(turmaSource)}
  GROUP BY anonymous_player_id
)
GROUP BY depth
ORDER BY depth`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}

/**
 * Q2 — average AND median session duration (never `session_finished`'s
 * own `duration_seconds` as the source: it fires on `pagehide` and is
 * intrinsically lossy — tab crash, force-quit, dead battery — kept only
 * as a reconciliation check, per issue #742). Grouped by `$session_id`,
 * restricted to sessions that actually reached `gameplay_started`, and
 * guarded to `BETWEEN 1 AND 14400` seconds (max 4 hours) to exclude
 * abandoned/zombie sessions from skewing the average. Median is returned
 * alongside average so a PO can see outlier distortion.
 *
 * Also returns `sessions_started` — `count()` over the same grouped set,
 * i.e. the number of distinct sessions that reached `gameplay_started`.
 * This is issue #745's card 2 ("Sessões iniciadas"), which is a session
 * count, not a unique-player count — a returning player across two
 * sessions counts twice here, unlike card 1's `uniqExactIf`.
 */
export function buildSessionDurationQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
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
  WHERE ${commonPredicate(turmaSource)}
  GROUP BY session_id
  HAVING countIf(event = 'gameplay_started') > 0
     AND duration_seconds BETWEEN 1 AND 14400
)`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}

/**
 * Card 7 ("Taxa de aprovação no quiz") — per-attempt pass rate, not
 * per-player: `countIf`, not `uniqExactIf`. A player who retries a failed
 * quiz and passes contributes one failure and one pass, which is the
 * correct denominator for "of the quiz attempts made, how many passed" —
 * the auditor-facing question this card answers, distinct from card 1's
 * per-player funnel counts. `properties.passed` is set on every
 * `quiz_completed` event (see EVENTS.md).
 */
export function buildQuizPassRateQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const query = `
SELECT
  countIf(event = 'quiz_completed' AND toBool(properties.passed)) AS passed,
  countIf(event = 'quiz_completed') AS total
FROM events
WHERE ${commonPredicate(turmaSource)}`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}

/**
 * Campaign-origins breakdown for #746 — "#746 requires a table of
 * origins with user counts; #742 states the API surface has no campaign
 * parameter. One /api/edital/campaigns route returning a breakdown for
 * the caller's own slug only, with the breakdown in the response body
 * and no parameter in the request" (discovery §2.6).
 *
 * Groups by `properties.utm_source` — the sub-origin *within* the
 * caller's own institution slug (e.g. an Instagram-tagged link vs a
 * WhatsApp-tagged link, both carrying the same `utm_institution` but
 * different `utm_source`, per `buildTrackingUrl`'s optional `source`
 * param). posthog-js auto-captures standard `utm_*` params (discovery
 * §3.1's "three findings the issues miss"), so no new instrumentation
 * was needed to make this real instead of the single-row placeholder it
 * was before origins.ts existed. Rows with no `utm_source` at all (a
 * bare link with only `utm_institution`) group under `'direto'`.
 *
 * Deliberately NOT turma-filtered: this is the per-link breakdown feature
 * (#746) that lists all of an institution's links, independent of #807's
 * turma filter — filtering it by turma would always show either one row
 * or zero, which isn't what this table is for.
 */
export function buildCampaignsQuery(
  scope: Scope,
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  coalesce(nullIf(properties.utm_source, ''), 'direto') AS source,
  uniqExactIf(properties.anonymous_player_id, event = 'landing_page_viewed') AS unique_players
FROM events
WHERE ${commonPredicate()}
GROUP BY source
ORDER BY unique_players DESC`.trim();

  return { query, values: baseValues(scope, range) };
}

/**
 * #807 completion rate: players who completed the last level
 * (`level_completed` with the highest `level_number`, resolved by the
 * caller from LEVEL_REGISTRY — this query only takes the raw number so it
 * never hardcodes the game's level count) over players who started.
 * Institution-wide when `turmaSource` is absent, turma-scoped otherwise.
 */
export function buildCompletionRateQuery(
  scope: Scope,
  range: ResolvedDateRange,
  finalLevelNumber: number,
  turmaSource?: string,
): HogQLQueryPlan {
  const query = `
SELECT
  uniqExactIf(properties.anonymous_player_id, event = 'gameplay_started') AS started,
  uniqExactIf(properties.anonymous_player_id, event = 'level_completed' AND toInt(properties.level_number) = {final_level_number}) AS completed
FROM events
WHERE ${commonPredicate(turmaSource)}`.trim();

  return {
    query,
    values: {
      ...baseValues(scope, range, turmaSource),
      final_level_number: finalLevelNumber,
    },
  };
}

/**
 * #807 "progresso por fase" — the reached half: unique players who
 * entered each level, via `game_started` (fires every level entry,
 * carries `level_id`) — NOT `gameplay_started` (fires once per session
 * only, no per-level signal) and NOT the backend's own `LEVEL_STARTED`
 * (a different pipeline entirely: NestJS/Postgres `game_event`, which
 * this HogQL-only dashboard never queries). Paired with
 * `buildPhaseCompletionQuery` below (the completed half).
 */
export function buildPhaseReachedQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  uniqExact(properties.anonymous_player_id) AS players
FROM events
WHERE ${commonPredicate(turmaSource)} AND event = 'game_started'
GROUP BY level_id`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}

/**
 * #807 "progresso por fase" — unique players who completed each level,
 * grouped by `properties.level_id` (not `level_number`: HogQL has no join
 * to LEVEL_REGISTRY, so the number/title mapping happens in metrics.ts
 * instead, which already has that registry client-side).
 */
export function buildPhaseCompletionQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  uniqExact(properties.anonymous_player_id) AS players
FROM events
WHERE ${commonPredicate(turmaSource)} AND event = 'level_completed'
GROUP BY level_id`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}

/**
 * #807 "taxa de aprovação nos quizzes por fase" — per-`level_id` pass
 * rate, same per-attempt `countIf` semantics as `buildQuizPassRateQuery`
 * (a retried-then-passed attempt counts once in each bucket), just
 * grouped by level instead of collapsed institution-wide.
 */
export function buildPhaseQuizPassRateQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  countIf(event = 'quiz_completed' AND toBool(properties.passed)) AS passed,
  countIf(event = 'quiz_completed') AS total
FROM events
WHERE ${commonPredicate(turmaSource)}
GROUP BY level_id`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}

/**
 * #807 P1 "uso de pistas por fase" — `clue_used` count per `level_id`. No
 * player-uniqueness claim here (issue asks for "quantidade média ou
 * percentual", left to the caller once real numbers are seen); this
 * returns the raw count per level, the least-assumption version.
 */
export function buildPhaseClueUsageQuery(
  scope: Scope,
  range: ResolvedDateRange,
  turmaSource?: string,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.level_id AS level_id,
  count() AS clue_uses
FROM events
WHERE ${commonPredicate(turmaSource)} AND event = 'clue_used'
GROUP BY level_id`.trim();

  return { query, values: baseValues(scope, range, turmaSource) };
}
