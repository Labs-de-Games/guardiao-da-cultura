/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import {
  buildCampaignsQuery,
  buildCriticalErrorsQuery,
  buildFunnelQuery,
  buildSessionDurationQuery,
  buildSummaryQuery,
  FUNNEL_EVENTS,
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
  ["buildCriticalErrorsQuery", buildCriticalErrorsQuery],
  ["buildCampaignsQuery", buildCampaignsQuery],
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

  it("buildSummaryQuery selects uniqExactIf for every canonical funnel event", () => {
    const { query } = buildSummaryQuery(scope, range);
    for (const event of FUNNEL_EVENTS) {
      expect(query).toContain(`event = '${event}'`);
    }
    expect(query.match(/uniqExactIf/g)?.length).toBe(FUNNEL_EVENTS.length);
  });

  it("buildFunnelQuery uses windowFunnel(604800) with all 7 step conditions", () => {
    const { query } = buildFunnelQuery(scope, range);
    expect(query).toContain("windowFunnel(604800)");
    for (const event of FUNNEL_EVENTS) {
      expect(query).toContain(`event = '${event}'`);
    }
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

  it("buildCriticalErrorsQuery filters to critical_error_occurred and groups by error_code", () => {
    const { query } = buildCriticalErrorsQuery(scope, range);
    expect(query).toContain("event = 'critical_error_occurred'");
    expect(query).toContain("GROUP BY error_code");
    expect(query).toContain("toBool(properties.is_blocking)");
  });
});
