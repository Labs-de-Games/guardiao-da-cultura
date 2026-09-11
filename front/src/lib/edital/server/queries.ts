import "server-only";
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
 */
const COMMON_PREDICATE = `timestamp >= toDateTime({from_ts}) AND timestamp < toDateTime({to_ts}) AND properties.anonymous_player_id IS NOT NULL AND properties.anonymous_player_id != '' AND properties.campaign_source = {slug}`;

function baseValues(scope: Scope, range: ResolvedDateRange): HogQLValues {
  return {
    slug: scope.slug,
    from_ts: range.from.toISOString(),
    to_ts: range.to.toISOString(),
  };
}

/**
 * The 7-step canonical funnel, in order — see docs/specs/edital-onepager.md
 * (interim pending the real onepager, per discovery §1.1). Shared by Q1
 * and Q4 so both queries name the same events the same way.
 */
export const FUNNEL_EVENTS = [
  "landing_page_viewed",
  "play_clicked",
  "gameplay_started",
  "chapter_1_started",
  "quiz_started",
  "quiz_completed",
  "chapter_1_completed",
] as const;

/**
 * Q1 — one round trip, `uniqExactIf` per funnel event. `uniqExact`, never
 * `uniq`: `uniq` is HyperLogLog with ~0.5% relative error — ±25 users on
 * a 5,000-user goal, on the one number the edital is judged by (issue
 * #742's own non-negotiable rule).
 *
 * The issue's exact wording maps this to "cards 1, 2, 4, 5, 7 e
 * numerador/denominador do card 3" — that numbering depends on the real
 * onepager's 8-card order, which is not yet committed (discovery §1.1).
 * Until it lands, this returns one unique-player count per funnel event;
 * mapping counts to card positions is the caller's (a future #745) job,
 * not baked in here.
 */
export function buildSummaryQuery(
  scope: Scope,
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const selects = FUNNEL_EVENTS.map(
    (name) =>
      `uniqExactIf(properties.anonymous_player_id, event = '${name}') AS ${name}`,
  ).join(",\n    ");

  return {
    query: `SELECT\n    ${selects}\nFROM events\nWHERE ${COMMON_PREDICATE}`,
    values: baseValues(scope, range),
  };
}

/**
 * Q4 — 7-step funnel via `windowFunnel`, which gives strict ordering and
 * monotonicity by construction (the first thing an evaluator checks).
 * `604800` is the 7-day window per issue #742. Grouped by person: one
 * funnel-depth value per `anonymous_player_id`, then a histogram of how
 * many players reached each depth.
 *
 * Fallback if `windowFunnel` isn't available on this PostHog plan (see
 * #739(a), still unanswered as of this step) is documented but NOT
 * implemented here — implementing an alternate query for a hypothetical
 * "not available" response would be guessing at an API error shape
 * nothing has observed yet. If #739(a) comes back negative, this
 * function's body is what needs replacing with `buildFunnelFallbackQuery`
 * using `uniqExactIf` per step instead (weaker guarantee: "steps
 * reached", not strict order).
 */
export function buildFunnelQuery(
  scope: Scope,
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const stepConditions = FUNNEL_EVENTS.map((name) => `event = '${name}'`).join(
    ",\n      ",
  );

  const query = `
SELECT depth, count() AS players
FROM (
  SELECT
    properties.anonymous_player_id AS anonymous_player_id,
    windowFunnel(604800)(
      timestamp,
      ${stepConditions}
    ) AS depth
  FROM events
  WHERE ${COMMON_PREDICATE}
  GROUP BY anonymous_player_id
)
GROUP BY depth
ORDER BY depth`.trim();

  return { query, values: baseValues(scope, range) };
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
 */
export function buildSessionDurationQuery(
  scope: Scope,
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT avg(duration_seconds) AS avg_seconds, median(duration_seconds) AS median_seconds
FROM (
  SELECT
    properties.\`$session_id\` AS session_id,
    dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
  FROM events
  WHERE ${COMMON_PREDICATE}
  GROUP BY session_id
  HAVING countIf(event = 'gameplay_started') > 0
     AND duration_seconds BETWEEN 1 AND 14400
)`.trim();

  return { query, values: baseValues(scope, range) };
}

/**
 * Q3 — critical errors: a total count (only rows where
 * `properties.is_blocking` is true) plus a breakdown by
 * `properties.error_code`.
 */
export function buildCriticalErrorsQuery(
  scope: Scope,
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT
  properties.error_code AS error_code,
  countIf(toBool(properties.is_blocking)) AS critical_count
FROM events
WHERE ${COMMON_PREDICATE} AND event = 'critical_error_occurred'
GROUP BY error_code
ORDER BY critical_count DESC`.trim();

  return { query, values: baseValues(scope, range) };
}

/**
 * Campaign-origins breakdown for #746 — "#746 requires a table of
 * origins with user counts; #742 states the API surface has no campaign
 * parameter. One /api/edital/campaigns route returning a breakdown for
 * the caller's own slug only, with the breakdown in the response body
 * and no parameter in the request" (discovery §2.6).
 *
 * This returns the caller's own total unique-player count. The full
 * per-link/per-origin breakdown #746 wants depends on that issue's
 * origins.ts taxonomy, which is not committed yet (discovery §4's
 * CAMPAIGN_ORIGINS open question) — grouping by a `campaign_source`
 * already equal to the caller's own slug for every row is a single-row,
 * degenerate breakdown, not a real one. Flagged here rather than
 * fabricated; #746 revisits this query once origins.ts exists.
 */
export function buildCampaignsQuery(
  scope: Scope,
  range: ResolvedDateRange,
): HogQLQueryPlan {
  const query = `
SELECT uniqExactIf(properties.anonymous_player_id, event = 'landing_page_viewed') AS unique_players
FROM events
WHERE ${COMMON_PREDICATE}`.trim();

  return { query, values: baseValues(scope, range) };
}
