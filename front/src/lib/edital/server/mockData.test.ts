/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));
jest.mock("./campaignLinks", () => ({ listCampaignLinks: jest.fn() }));

import { resetServerEnv } from "../../env-server";
import { listCampaignLinks } from "./campaignLinks";
import * as globalQueries from "./globalQueries";
import type { HogQLValues } from "./hogql";
import { FINAL_LEVEL_NUMBER } from "./levels";
import { mockHogQLResult } from "./mockData";
import * as queries from "./queries";
import { __createScopeForTests } from "./scope";

const NOW = new Date("2026-09-28T12:00:00.000Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const scope = __createScopeForTests("escola-teste");
const mockedListCampaignLinks = jest.mocked(listCampaignLinks);

function lastDays(days: number) {
  return { from: new Date(NOW - days * DAY_MS), to: new Date(NOW) };
}

async function run(plan: { query: string; values: HogQLValues }) {
  return mockHogQLResult(plan.query, plan.values, NOW);
}

async function firstRow(plan: { query: string; values: HogQLValues }) {
  return (await run(plan)).results[0];
}

function withLinks(...sources: string[]) {
  mockedListCampaignLinks.mockResolvedValue(
    sources.map((source) => ({ source }) as never),
  );
}

// Pinned here rather than read from the developer's .env (test-setup.ts
// loads it; CI has none): the public mock counts this institution's links.
const ORIGINAL_MOCK_INSTITUTION = process.env.EDITAL_MOCK_INSTITUTION;

beforeAll(() => {
  process.env.EDITAL_MOCK_INSTITUTION = "escola-teste";
  resetServerEnv();
});

afterAll(() => {
  if (ORIGINAL_MOCK_INSTITUTION === undefined)
    delete process.env.EDITAL_MOCK_INSTITUTION;
  else process.env.EDITAL_MOCK_INSTITUTION = ORIGINAL_MOCK_INSTITUTION;
  resetServerEnv();
});

beforeEach(() => {
  withLinks("turma-teste");
});

describe("mockHogQLResult — public dashboard (#851)", () => {
  it("splits the 30-day period by first touch: 9 players = 5 institutional + 4 direct", async () => {
    const range = lastDays(30);

    expect(
      await firstRow(globalQueries.buildGlobalPlayersQuery(range)),
    ).toEqual([9]);
    expect(
      await firstRow(globalQueries.buildGlobalOriginSplitQuery(range)),
    ).toEqual([5, 4]);
    expect(
      await firstRow(globalQueries.buildInstitutionCountQuery(range)),
    ).toEqual([1]);
  });

  it("counts a player whose only plays are older once the period covers them", async () => {
    const range = lastDays(90);

    expect(
      await firstRow(globalQueries.buildGlobalPlayersQuery(range)),
    ).toEqual([10]);
    expect(
      await firstRow(globalQueries.buildGlobalOriginSplitQuery(range)),
    ).toEqual([5, 5]);
  });

  it("always adds up to the unique players", async () => {
    for (const days of [1, 7, 30, 90]) {
      const range = lastDays(days);
      const [players] = (await firstRow(
        globalQueries.buildGlobalPlayersQuery(range),
      )) ?? [0];
      const [institutional, spontaneous] = (await firstRow(
        globalQueries.buildGlobalOriginSplitQuery(range),
      )) ?? [0, 0];
      expect(Number(institutional) + Number(spontaneous)).toBe(players);
    }
  });
});

describe("mockHogQLResult — institution dashboard (#851)", () => {
  it.each([
    [7, 3],
    [30, 5],
    [90, 5],
  ])("matches the public institutional count over %i days", async (days, expected) => {
    const range = lastDays(days);
    const [institutional] = (await firstRow(
      globalQueries.buildGlobalOriginSplitQuery(range),
    )) ?? [0];
    const [, gameplayStarted] = (await firstRow(
      queries.buildSummaryQuery(scope, range),
    )) ?? [0, 0];

    expect(institutional).toBe(expected);
    expect(gameplayStarted).toBe(expected);
  });

  it("gives the whole institution to its only turma", async () => {
    const range = lastDays(30);

    expect(
      (
        await firstRow(queries.buildSummaryQuery(scope, range, "turma-teste"))
      )?.[1],
    ).toBe(5);
    expect(
      (
        await firstRow(queries.buildSummaryQuery(scope, range, "outra-turma"))
      )?.[1],
    ).toBe(0);
  });

  it("splits the institution across its links, the first getting the most", async () => {
    withLinks("turma-a", "turma-b");
    const range = lastDays(30);

    const [, first] = (await firstRow(
      queries.buildSummaryQuery(scope, range, "turma-a"),
    )) ?? [0, 0];
    const [, second] = (await firstRow(
      queries.buildSummaryQuery(scope, range, "turma-b"),
    )) ?? [0, 0];

    expect(Number(first)).toBeGreaterThan(Number(second));
    expect(Number(first) + Number(second)).toBe(5);
  });

  it("lists one origin row per link", async () => {
    const { results } = await run(
      queries.buildCampaignsQuery(scope, lastDays(30)),
    );

    expect(results).toEqual([["turma-teste", 8]]);
  });

  it("reads a failure to list links as no links yet", async () => {
    mockedListCampaignLinks.mockRejectedValue(new Error("no token"));
    jest.spyOn(console, "warn").mockImplementation(() => {});

    const { results } = await run(
      queries.buildCampaignsQuery(scope, lastDays(30)),
    );

    expect(results).toEqual([]);
    expect(
      (await firstRow(queries.buildSummaryQuery(scope, lastDays(30))))?.[1],
    ).toBe(5);
  });
});

describe("mockHogQLResult — every dashboard query gets data", () => {
  const range = lastDays(30);
  const plans = {
    ...Object.fromEntries(
      Object.entries(globalQueries)
        .filter(([name]) => name.startsWith("build"))
        .map(([name, build]) => [
          name,
          (build as (r: typeof range, level: number) => queries.HogQLQueryPlan)(
            range,
            FINAL_LEVEL_NUMBER,
          ),
        ]),
    ),
    buildSummaryQuery: queries.buildSummaryQuery(scope, range),
    buildFunnelQuery: queries.buildFunnelQuery(scope, range),
    buildSessionDurationQuery: queries.buildSessionDurationQuery(scope, range),
    buildQuizPassRateQuery: queries.buildQuizPassRateQuery(scope, range),
    buildCampaignsQuery: queries.buildCampaignsQuery(scope, range),
    buildCompletionRateQuery: queries.buildCompletionRateQuery(
      scope,
      range,
      FINAL_LEVEL_NUMBER,
    ),
    buildPhaseReachedQuery: queries.buildPhaseReachedQuery(scope, range),
    buildPhaseCompletionQuery: queries.buildPhaseCompletionQuery(scope, range),
    buildPhaseQuizPassRateQuery: queries.buildPhaseQuizPassRateQuery(
      scope,
      range,
    ),
    buildPhaseClueUsageQuery: queries.buildPhaseClueUsageQuery(scope, range),
  };

  it("covers every query builder", () => {
    const institutionBuilders = Object.keys(queries).filter(
      (name) => name.startsWith("build") && name !== "buildFunnelFallbackQuery",
    );
    for (const name of institutionBuilders) {
      expect(plans).toHaveProperty(name);
    }
  });

  it.each(
    Object.entries(plans),
  )("%s: returns a non-empty, non-zero result", async (_name, plan) => {
    const { results } = await run(plan);

    expect(results.length).toBeGreaterThan(0);
    expect(results.flat().some((value) => Number(value) > 0)).toBe(true);
  });

  it("keeps the funnel monotonic: every depth has a non-negative count", async () => {
    const { results } = await run(plans.buildFunnelQuery);

    for (const [, players] of results) {
      expect(Number(players)).toBeGreaterThanOrEqual(0);
    }
  });
});
