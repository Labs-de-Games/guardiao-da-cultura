/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

const mockListCampaignLinks = jest.fn();
jest.mock("./campaignLinks", () => ({
  listCampaignLinks: (...args: unknown[]) => mockListCampaignLinks(...args),
}));

import * as globalQueries from "./globalQueries";
import { mockHogQLResult } from "./mockData";
import * as queries from "./queries";
import { __createScopeForTests } from "./scope";

const scope = __createScopeForTests("escola-teste");
const range = {
  from: new Date("2026-01-01T00:00:00Z"),
  to: new Date("2026-01-31T23:59:59Z"),
};

type Builder = (...args: never[]) => queries.HogQLQueryPlan;

const SCOPED = Object.entries(queries).filter(([name]) =>
  name.startsWith("build"),
) as [string, Builder][];
const GLOBAL = Object.entries(globalQueries).filter(([name]) =>
  name.startsWith("build"),
) as [string, Builder][];

const TURMAS = ["turma-3a", "turma-3b", "grupo-teatro"];

beforeEach(() => {
  mockListCampaignLinks.mockReset();
  mockListCampaignLinks.mockResolvedValue(
    TURMAS.map((source, index) => ({
      id: String(index),
      source,
      createdAt: "2026-01-01T00:00:00Z",
    })),
  );
});

async function run(
  plan: queries.HogQLQueryPlan,
  scenario: "default" | "no-level-4" = "default",
) {
  return mockHogQLResult(plan.query, plan.values, scenario);
}

describe("mockHogQLResult", () => {
  it.each(SCOPED)("%s: recognised, returns rows", async (_name, build) => {
    const plan = (
      build as (s: typeof scope, r: typeof range) => queries.HogQLQueryPlan
    )(scope, range);
    expect((await run(plan)).results.length).toBeGreaterThan(0);
  });

  it.each(GLOBAL)("%s: recognised, returns rows", async (_name, build) => {
    const plan = (build as (r: typeof range) => queries.HogQLQueryPlan)(range);
    expect((await run(plan)).results.length).toBeGreaterThan(0);
  });

  it("returns every level's stars", async () => {
    const plan = queries.buildPhaseStarsQuery(scope, range);
    const { results } = await run(plan);
    expect(results.map((row) => row[0])).toEqual([
      "level_01",
      "level_02",
      "level_03",
      "level_04",
    ]);
  });

  it("never returns a quiz row for level 4", async () => {
    const plan = queries.buildPhaseQuizPassRateQuery(scope, range);
    const { results } = await run(plan);
    expect(results.map((row) => row[0])).not.toContain("level_04");
  });

  const players = async (plan: queries.HogQLQueryPlan) =>
    (await run(plan)).results[0][0] as number;

  it("gives the institution 75% of everyone, the rest being direct access", async () => {
    const everyone = await players(
      globalQueries.buildGlobalPlayersQuery(range),
    );
    const institution = await players(
      queries.buildCompletionRateQuery(scope, range),
    );
    expect(everyone).toBe(600);
    expect(institution).toBe(450);

    const split = await run(globalQueries.buildGlobalOriginSplitQuery(range));
    expect(split.results[0]).toEqual([450, 150]);
  });

  it("splits the institution across its real links, each turma its own share", async () => {
    const shares = await Promise.all(
      TURMAS.map((turma) =>
        players(queries.buildCompletionRateQuery(scope, range, turma)),
      ),
    );
    expect(new Set(shares).size).toBe(TURMAS.length);
    expect(shares.reduce((sum, count) => sum + count, 0)).toBeCloseTo(450, -1);
    expect(mockListCampaignLinks).toHaveBeenCalledWith({
      slug: "escola-teste",
    });
  });

  it("lists one origins row per link, never a 'direto' row", async () => {
    const { results } = await run(queries.buildCampaignsQuery(scope, range));
    expect(results.map((row) => row[0])).toEqual(TURMAS);
  });

  it("has no turma rows while the institution has no links", async () => {
    mockListCampaignLinks.mockResolvedValue([]);
    const { results } = await run(queries.buildCampaignsQuery(scope, range));
    expect(results).toEqual([]);
    expect(await players(queries.buildCompletionRateQuery(scope, range))).toBe(
      450,
    );
  });

  it("treats a failing links call as no links", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    mockListCampaignLinks.mockRejectedValue(new Error("no token"));
    const { results } = await run(queries.buildCampaignsQuery(scope, range));
    expect(results).toEqual([]);
  });

  it("reports one active institution", async () => {
    const { results } = await run(
      globalQueries.buildInstitutionCountQuery(range),
    );
    expect(results).toEqual([[1]]);
  });

  it("drops level 4 in the no-level-4 scenario", async () => {
    const plan = queries.buildPhaseReachedQuery(scope, range);
    const { results } = await run(plan, "no-level-4");
    expect(results.map((row) => row[0])).not.toContain("level_04");
  });
});
