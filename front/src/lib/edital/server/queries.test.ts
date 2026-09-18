/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import {
  buildCampaignsQuery,
  buildCompletionRateQuery,
  buildFunnelQuery,
  buildPhaseClueUsageQuery,
  buildPhaseCompletionQuery,
  buildPhaseQuizPassRateQuery,
  buildPhaseReachedQuery,
  buildQuizPassRateQuery,
  buildSessionDurationQuery,
  buildSummaryQuery,
  getFunnelSteps,
} from "./queries";
import { __createScopeForTests } from "./scope";

const scope = __createScopeForTests("escola-teste");
const range = {
  from: new Date("2026-01-01T00:00:00Z"),
  to: new Date("2026-01-31T23:59:59Z"),
};

const ALL_BUILDERS = [
  ["buildSummaryQuery", buildSummaryQuery],
  ["buildFunnelQuery", buildFunnelQuery],
  ["buildSessionDurationQuery", buildSessionDurationQuery],
  ["buildCampaignsQuery", buildCampaignsQuery],
  ["buildQuizPassRateQuery", buildQuizPassRateQuery],
] as const;

/** Builders that accept an optional third `turmaSource` param — everything except buildCampaignsQuery. */
const TURMA_OPTIONAL_BUILDERS = [
  ["buildSummaryQuery", buildSummaryQuery],
  ["buildFunnelQuery", buildFunnelQuery],
  ["buildSessionDurationQuery", buildSessionDurationQuery],
  ["buildQuizPassRateQuery", buildQuizPassRateQuery],
] as const;

describe("HogQL query builders — non-negotiable rules (issue #742)", () => {
  it.each(
    ALL_BUILDERS,
  )("%s: never uses uniq( without Exact", (_name, build) => {
    const { query } = build(scope, range);
    // Matches a bare `uniq(` call that is not `uniqExact(`/`uniqExactIf(`.
    const bareUniq = /\buniq\s*\(/g.test(query.replace(/uniqExact\w*/g, ""));
    expect(bareUniq).toBe(false);
  });

  it.each(
    ALL_BUILDERS,
  )("%s: includes the institution predicate (campaign_source = {slug})", (_name, build) => {
    const { query } = build(scope, range);
    expect(query).toContain("properties.campaign_source = {slug}");
  });

  it.each(
    ALL_BUILDERS,
  )("%s: never interpolates the actual slug value into the query string", (_name, build) => {
    const { query } = build(scope, range);
    expect(query).not.toContain("escola-teste");
  });

  it.each(
    ALL_BUILDERS,
  )("%s: binds slug/from_ts/to_ts as values, not string concatenation", (_name, build) => {
    const { values } = build(scope, range);
    expect(values).toEqual({
      slug: "escola-teste",
      from_ts: range.from.toISOString(),
      to_ts: range.to.toISOString(),
    });
  });

  it.each(
    ALL_BUILDERS,
  )("%s: filters out rows with an empty/missing anonymous_player_id", (_name, build) => {
    const { query } = build(scope, range);
    expect(query).toContain("properties.anonymous_player_id IS NOT NULL");
    expect(query).toContain("properties.anonymous_player_id != ''");
  });

  it("buildSummaryQuery selects uniqExactIf for landing_page_viewed and gameplay_started", () => {
    const { query } = buildSummaryQuery(scope, range);
    expect(query).toContain("event = 'landing_page_viewed'");
    expect(query).toContain("event = 'gameplay_started'");
    expect(query.match(/uniqExactIf/g)?.length).toBe(2);
  });

  it("buildFunnelQuery uses windowFunnel(604800) with acquisition + one step per real level", () => {
    const { query } = buildFunnelQuery(scope, range);
    expect(query).toContain("windowFunnel(604800)");
    expect(query).toContain("event = 'landing_page_viewed'");
    expect(query).toContain("event = 'play_clicked'");
    expect(query).toContain("event = 'gameplay_started'");
    for (const step of getFunnelSteps()) {
      expect(query).toContain(step.condition);
    }
  });

  it("buildFunnelQuery never uses chapter_1_started/chapter_1_completed as the general base (issue #807)", () => {
    const { query } = buildFunnelQuery(scope, range);
    expect(query).not.toContain("chapter_1_started");
    expect(query).not.toContain("chapter_1_completed");
  });

  it("getFunnelSteps has one completion step per level, ordered by levelNumber, using level_number not level_id", () => {
    const steps = getFunnelSteps();
    const levelSteps = steps.slice(3); // after the 3 acquisition steps
    expect(levelSteps.length).toBeGreaterThanOrEqual(3);
    levelSteps.forEach((step, index) => {
      expect(step.condition).toContain(
        `toInt(properties.level_number) = ${index + 1}`,
      );
    });
  });

  it("buildSessionDurationQuery excludes sessions with no gameplay_started and guards duration bounds", () => {
    const { query } = buildSessionDurationQuery(scope, range);
    expect(query).toContain("countIf(event = 'gameplay_started') > 0");
    expect(query).toContain("BETWEEN 1 AND 14400");
    expect(query).toContain("median(");
    expect(query).toContain("avg(");
  });

  it("buildSessionDurationQuery does not source duration from session_finished", () => {
    const { query } = buildSessionDurationQuery(scope, range);
    expect(query).not.toContain("session_finished");
    expect(query).not.toContain("duration_seconds'");
  });

  it("buildSessionDurationQuery also selects sessions_started (card 2)", () => {
    const { query } = buildSessionDurationQuery(scope, range);
    expect(query).toContain("count() AS sessions_started");
  });

  it("buildQuizPassRateQuery counts quiz_completed attempts, not unique players", () => {
    const { query } = buildQuizPassRateQuery(scope, range);
    expect(query).toContain("countIf(event = 'quiz_completed'");
    expect(query).not.toContain("uniqExact");
  });

  it("buildQuizPassRateQuery filters passed attempts via properties.passed", () => {
    const { query } = buildQuizPassRateQuery(scope, range);
    expect(query).toContain("toBool(properties.passed)");
  });

  it("buildCampaignsQuery groups by utm_source (a real breakdown, not a single total)", () => {
    const { query } = buildCampaignsQuery(scope, range);
    expect(query).toContain("GROUP BY source");
    expect(query).toContain("properties.utm_source");
  });

  it("buildCampaignsQuery labels a missing utm_source as 'direto'", () => {
    const { query } = buildCampaignsQuery(scope, range);
    expect(query).toContain(
      "coalesce(nullIf(properties.utm_source, ''), 'direto')",
    );
  });
});

describe("cross-institution isolation (issue #744 acceptance: A only sees A's data)", () => {
  const scopeA = __createScopeForTests("escola-a");
  const scopeB = __createScopeForTests("escola-b");

  it.each(
    ALL_BUILDERS,
  )("%s: binds each institution's own slug, never the other's", (_name, build) => {
    const planA = build(scopeA, range);
    const planB = build(scopeB, range);

    expect(planA.values.slug).toBe("escola-a");
    expect(planB.values.slug).toBe("escola-b");
    expect(planA.values.slug).not.toBe(planB.values.slug);
  });

  it.each(
    ALL_BUILDERS,
  )("%s: query text is identical for both scopes — isolation lives entirely in the bound value, not the query shape", (_name, build) => {
    const planA = build(scopeA, range);
    const planB = build(scopeB, range);

    expect(planA.query).toBe(planB.query);
    expect(planA.query).not.toContain("escola-a");
    expect(planA.query).not.toContain("escola-b");
  });
});

describe("optional turma filter on existing queries (issue #807)", () => {
  it.each(
    TURMA_OPTIONAL_BUILDERS,
  )("%s: institution-wide (no turmaSource) never binds a source value", (_name, build) => {
    const { query, values } = build(scope, range);
    expect(values.source).toBeUndefined();
    expect(query).not.toContain("turma_source");
  });

  it.each(
    TURMA_OPTIONAL_BUILDERS,
  )("%s: with a turmaSource, binds it and adds the turma_source clause, never string-interpolated", (_name, build) => {
    const { query, values } = build(scope, range, "group-a");
    expect(values.source).toBe("group-a");
    expect(query).not.toContain("group-a");
    expect(query).toContain("properties.turma_source = {source}");
  });

  it("buildCampaignsQuery has no turma parameter at all — deliberately institution-wide always", () => {
    expect(buildCampaignsQuery.length).toBe(2);
  });
});

describe("phase (per-level) query builders (issue #807)", () => {
  const PHASE_BUILDERS = [
    ["buildPhaseReachedQuery", buildPhaseReachedQuery],
    ["buildPhaseCompletionQuery", buildPhaseCompletionQuery],
    ["buildPhaseQuizPassRateQuery", buildPhaseQuizPassRateQuery],
    ["buildPhaseClueUsageQuery", buildPhaseClueUsageQuery],
  ] as const;

  it.each(
    PHASE_BUILDERS,
  )("%s: institution-wide by default, turma-scoped when a turmaSource is given", (_name, build) => {
    const institutionWide = build(scope, range);
    expect(institutionWide.values.source).toBeUndefined();
    expect(institutionWide.query).not.toContain("turma_source");

    const turmaScoped = build(scope, range, "group-a");
    expect(turmaScoped.values.source).toBe("group-a");
    expect(turmaScoped.query).toContain("properties.turma_source = {source}");
  });

  it("buildPhaseReachedQuery groups game_started players by level_id (not gameplay_started, not level_started)", () => {
    const { query } = buildPhaseReachedQuery(scope, range);
    expect(query).toContain("event = 'game_started'");
    expect(query).toContain("GROUP BY level_id");
  });

  it("buildPhaseCompletionQuery groups completed players by level_id", () => {
    const { query } = buildPhaseCompletionQuery(scope, range);
    expect(query).toContain("event = 'level_completed'");
    expect(query).toContain("GROUP BY level_id");
  });

  it("buildPhaseQuizPassRateQuery groups per-attempt pass/total by level_id", () => {
    const { query } = buildPhaseQuizPassRateQuery(scope, range);
    expect(query).toContain(
      "countIf(event = 'quiz_completed' AND toBool(properties.passed))",
    );
    expect(query).toContain("countIf(event = 'quiz_completed')");
    expect(query).toContain("GROUP BY level_id");
  });

  it("buildPhaseClueUsageQuery counts clue_used grouped by level_id", () => {
    const { query } = buildPhaseClueUsageQuery(scope, range);
    expect(query).toContain("event = 'clue_used'");
    expect(query).toContain("GROUP BY level_id");
  });

  it("two turmas of the same institution never share a bound source value", () => {
    const planA = buildPhaseReachedQuery(scope, range, "group-a");
    const planB = buildPhaseReachedQuery(scope, range, "group-b");
    expect(planA.query).toBe(planB.query);
    expect(planA.values.source).not.toBe(planB.values.source);
  });
});

describe("buildCompletionRateQuery (issue #807)", () => {
  it("binds the final level number and never interpolates it into the query string", () => {
    const { query, values } = buildCompletionRateQuery(scope, range, 3);
    expect(values.final_level_number).toBe(3);
    expect(query).toContain(
      "toInt(properties.level_number) = {final_level_number}",
    );
    expect(query).not.toContain("= 3");
  });

  it("is institution-wide by default, turma-scoped when a turmaSource is given", () => {
    const institutionWide = buildCompletionRateQuery(scope, range, 3);
    expect(institutionWide.values.source).toBeUndefined();

    const turmaScoped = buildCompletionRateQuery(scope, range, 3, "group-a");
    expect(turmaScoped.values.source).toBe("group-a");
    expect(turmaScoped.query).toContain("properties.turma_source = {source}");
  });
});
