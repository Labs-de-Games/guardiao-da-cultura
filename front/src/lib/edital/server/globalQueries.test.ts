/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";

import * as globalQueries from "./globalQueries";
import {
  buildGlobalCompletionRateQuery,
  buildGlobalOriginSplitQuery,
  buildGlobalPhaseProgressionQuery,
  buildGlobalPhaseReachedQuery,
  buildGlobalPhaseStarsQuery,
  buildInstitutionCountQuery,
  buildTurmaCountQuery,
} from "./globalQueries";
import type { HogQLQueryPlan } from "./queries";

const range = {
  from: new Date("2026-01-01T03:00:00.000Z"),
  to: new Date("2026-01-31T02:59:59.999Z"),
};

const BUILDERS = Object.entries(globalQueries).filter(
  ([name, value]) => name.startsWith("build") && typeof value === "function",
) as [string, (r: typeof range) => HogQLQueryPlan][];

describe("public dashboard queries — unset optional properties", () => {
  it("classifies a player without campaign_source (NULL) as direct, not institutional", () => {
    const { query } = buildGlobalOriginSplitQuery(range);
    expect(query).toContain(
      "coalesce(properties.campaign_source, '') != '') AS institutional",
    );
    expect(query).toContain(
      "coalesce(properties.campaign_source, '') = '') AS spontaneous",
    );
  });

  it("guards the institution and turma counts the same way", () => {
    expect(buildInstitutionCountQuery(range).query).toContain(
      "coalesce(properties.campaign_source, '') != ''",
    );
    expect(buildTurmaCountQuery(range).query).toContain(
      "coalesce(properties.turma_source, '') != ''",
    );
  });

  it.each(
    BUILDERS,
  )("%s: never compares an optional property to '' without coalesce", (_name, build) => {
    const { query } = build(range);
    expect(query).not.toMatch(
      /(?<!coalesce\()properties\.(campaign_source|turma_source)\s*!?=\s*''/,
    );
  });
});

describe("public dashboard query builders", () => {
  it("covers every exported builder", () => {
    expect(BUILDERS.length).toBeGreaterThan(0);
  });

  it.each(
    BUILDERS,
  )("%s: narrows to the current deployment's own events", (_name, build) => {
    const { query, values } = build(range);
    expect(query).toContain("properties.environment = {environment}");
    // test-setup.ts runs the suite as "development", with no AUTH_URL.
    expect(values).toMatchObject({ environment: "development" });
  });
});

describe("public dashboard — level 4 (the investigation)", () => {
  it("counts finishing the game as completing the investigation", () => {
    expect(buildGlobalCompletionRateQuery(range).query).toContain(
      "uniqExactIf(properties.anonymous_player_id, event = 'investigation_completed') AS completed",
    );
  });

  it("adds a level 4 step to the phase progression", () => {
    expect(buildGlobalPhaseProgressionQuery(range).query).toContain(
      "uniqExactIf(properties.anonymous_player_id, event = 'investigation_completed') AS level_4_completed",
    );
  });

  it("counts investigation_opened as reaching level 4", () => {
    expect(buildGlobalPhaseReachedQuery(range).query).toContain(
      "event IN ('game_started', 'investigation_opened')",
    );
  });

  it("builds the per-level stars query", () => {
    expect(buildGlobalPhaseStarsQuery(range).query).toContain(
      "avg(best_stars) AS avg_stars",
    );
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
    BUILDERS,
  )("%s: scopes by the deployment's host, not the environment tag", (_name, build) => {
    const { query, values } = build(range);
    expect(query).toContain("properties.$host = {host}");
    expect(query).not.toContain("properties.environment");
    expect(values).toMatchObject({
      host: "development-guardiaodacultura.42.rio",
    });
    expect(values).not.toHaveProperty("environment");
  });
});
