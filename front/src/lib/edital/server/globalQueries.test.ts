/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";

import * as globalQueries from "./globalQueries";
import {
  buildGlobalOriginSplitQuery,
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
      "if(coalesce(properties.campaign_source, '') != '', 'institutional', 'direct')",
    );
    expect(query).toContain("coalesce(properties.entry_origin, '') != ''");
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

describe("buildGlobalOriginSplitQuery — first touch per player (#851)", () => {
  const { query } = buildGlobalOriginSplitQuery(range);

  it("classifies each player once, by their first gameplay_started", () => {
    expect(query).toContain("GROUP BY player");
    expect(query).toMatch(
      /argMin\([\s\S]*tuple\(timestamp, uuid\)\s*\) AS first_origin/,
    );
    expect(query).toContain(
      "countIf(first_origin = 'institutional') AS institutional",
    );
    expect(query).toContain(
      "countIf(first_origin != 'institutional') AS spontaneous",
    );
  });

  it("prefers entry_origin and falls back to campaign_source for legacy events", () => {
    expect(query).toContain(
      "if(coalesce(properties.entry_origin, '') != '', properties.entry_origin, if(coalesce(properties.campaign_source, '') != '', 'institutional', 'direct'))",
    );
  });

  it("classifies over the whole history, counting only players active in the period", () => {
    const inner = query.slice(
      query.indexOf("FROM events"),
      query.indexOf("GROUP BY"),
    );
    expect(inner).toContain("timestamp < toDateTime({to_ts})");
    expect(inner).not.toContain("timestamp >= toDateTime({from_ts})");
    expect(query).toContain(
      "countIf(timestamp >= toDateTime({from_ts})) AS plays_in_period",
    );
    expect(query).toMatch(/WHERE plays_in_period > 0$/);
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
