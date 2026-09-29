/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";

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
      // test-setup.ts runs the suite as "development", with no AUTH_URL.
      environment: "development",
      slug: "escola-teste",
      from_ts: range.from.toISOString(),
      to_ts: range.to.toISOString(),
    });
  });

  it.each(
    ALL_BUILDERS,
  )("%s: narrows to the current deployment's own events", (_name, build) => {
    const { query } = build(scope, range);
    expect(query).toContain("properties.environment = {environment}");
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

  it("getFunnelSteps has one completion step per level 1–3, using level_number not level_id", () => {
    const steps = getFunnelSteps();
    const levelSteps = steps.slice(3, 6); // after the 3 acquisition steps
    levelSteps.forEach((step, index) => {
      expect(step.condition).toContain(
        `toInt(properties.level_number) = ${index + 1}`,
      );
    });
  });

  it("getFunnelSteps ends on finishing the investigation (level 4)", () => {
    const steps = getFunnelSteps();
    expect(steps).toHaveLength(7);
    const last = steps[steps.length - 1];
    expect(last.label).toContain("Concluiu Fase 4");
    expect(last.condition).toBe("event = 'investigation_completed'");
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
    ["buildPhaseStarsQuery", buildPhaseStarsQuery],
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

  it("buildPhaseReachedQuery groups game_started and investigation_opened players by level (not gameplay_started, not level_started)", () => {
    const { query } = buildPhaseReachedQuery(scope, range);
    expect(query).toContain(
      "event IN ('game_started', 'investigation_opened')",
    );
    expect(query).not.toContain("gameplay_started");
    expect(query).toContain("GROUP BY level_id");
  });

  it("buildPhaseCompletionQuery groups level_completed and investigation_completed players by level", () => {
    const { query } = buildPhaseCompletionQuery(scope, range);
    expect(query).toContain(
      "event IN ('level_completed', 'investigation_completed')",
    );
    expect(query).toContain("GROUP BY level_id");
  });

  it("maps investigation events to level_04 even without a level_id property", () => {
    const { query } = buildPhaseCompletionQuery(scope, range);
    expect(query).toContain(
      "multiIf(event IN ('investigation_opened', 'investigation_completed', 'investigation_clue_placed'), 'level_04', properties.level_id) AS level_id",
    );
  });

  it("buildPhaseQuizPassRateQuery groups per-attempt pass/total by level_id", () => {
    const { query } = buildPhaseQuizPassRateQuery(scope, range);
    expect(query).toContain(
      "countIf(event = 'quiz_completed' AND toBool(properties.passed))",
    );
    expect(query).toContain("countIf(event = 'quiz_completed')");
    expect(query).toContain("GROUP BY level_id");
  });

  it("buildPhaseClueUsageQuery counts collected clues (1–3) and board placements (4), never clue_used", () => {
    const { query } = buildPhaseClueUsageQuery(scope, range);
    expect(query).toContain(
      "event = 'clue_collected' AND properties.level_id = 'level_01'",
    );
    expect(query).toContain("event = 'investigation_clue_placed'");
    expect(query).not.toContain("clue_used");
    expect(query).toContain("GROUP BY level_id");
  });

  it("buildPhaseClueUsageQuery excludes the tutorial's scripted drop", () => {
    const { query } = buildPhaseClueUsageQuery(scope, range);
    expect(query).toContain(
      "NOT coalesce(toBool(properties.is_tutorial), false)",
    );
  });

  it("buildPhaseStarsQuery averages each player's best stars per level", () => {
    const { query } = buildPhaseStarsQuery(scope, range);
    expect(query).toContain("max(toFloat(properties.stars)) AS best_stars");
    expect(query).toContain("avg(best_stars) AS avg_stars");
    expect(query).not.toContain("max_stars");
    expect(query).toContain("GROUP BY level_id, player_id");
    expect(query).toContain(
      "event IN ('level_completed', 'investigation_completed')",
    );
  });

  it("two turmas of the same institution never share a bound source value", () => {
    const planA = buildPhaseReachedQuery(scope, range, "group-a");
    const planB = buildPhaseReachedQuery(scope, range, "group-b");
    expect(planA.query).toBe(planB.query);
    expect(planA.values.source).not.toBe(planB.values.source);
  });
});

describe("buildCompletionRateQuery (issue #807)", () => {
  it("counts finishing the game as completing the investigation", () => {
    const { query } = buildCompletionRateQuery(scope, range);
    expect(query).toContain(
      "uniqExactIf(properties.anonymous_player_id, event = 'investigation_completed') AS completed",
    );
    expect(query).not.toContain("level_completed");
  });

  it("is institution-wide by default, turma-scoped when a turmaSource is given", () => {
    const institutionWide = buildCompletionRateQuery(scope, range);
    expect(institutionWide.values.source).toBeUndefined();

    const turmaScoped = buildCompletionRateQuery(scope, range, "group-a");
    expect(turmaScoped.values.source).toBe("group-a");
    expect(turmaScoped.query).toContain("properties.turma_source = {source}");
  });
});

describe("deployed environment (AUTH_URL set)", () => {
  const ORIGINAL_AUTH_URL = process.env.AUTH_URL;

  beforeEach(() => {
    process.env.AUTH_URL = "https://development-guardiaodacultura.42.rio";
    resetServerEnv();
  });

  afterEach(() => {
    if (ORIGINAL_AUTH_URL === undefined) delete process.env.AUTH_URL;
    else process.env.AUTH_URL = ORIGINAL_AUTH_URL;
    resetServerEnv();
  });

  it.each(
    ALL_BUILDERS,
  )("%s: scopes by the deployment's host, not the environment tag", (_name, build) => {
    const { query, values } = build(scope, range);
    expect(query).toContain("properties.$host = {host}");
    expect(query).not.toContain("properties.environment");
    expect(values).toMatchObject({
      host: "development-guardiaodacultura.42.rio",
    });
    expect(values).not.toHaveProperty("environment");
  });
});
