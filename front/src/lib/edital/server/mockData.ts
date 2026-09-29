import "server-only";
import { serverEnv } from "../../env-server";
import { listCampaignLinks } from "./campaignLinks";
import type { HogQLQueryResult, HogQLValues } from "./hogql";
import { __createScopeForTests } from "./scope";

/**
 * Local-only stand-in for the PostHog Query API, so both edital dashboards
 * can be looked at without PostHog keys or real traffic. Enabled by
 * `EDITAL_MOCK_DATA` in development only — see env-server.ts's
 * `editalMockDataScenario()`, which refuses it under any other NODE_ENV.
 *
 * Everything above `runHogQLQuery` still runs for real (query builders,
 * metrics, routes, UI, CSV); only the HogQL response is canned. Queries are
 * recognised by the column aliases queries.ts/globalQueries.ts give them,
 * so a query this file doesn't know returns an empty result — the same
 * thing an empty period returns — rather than throwing.
 *
 * One institution: the public dashboard's totals are everyone (600 players),
 * of whom 75% arrived through that institution's links (450) and the rest
 * directly (150). An institution query — it carries `slug` — gets that 75%,
 * split across the institution's real turma/campaign links (read from the
 * back end, the same list the links page and turma filter show), so each
 * turma sees its own share and the shares add up to the institution.
 * Without links, the institution still has its 450 but no turma rows —
 * what a real institution sees before creating any.
 *
 * The numbers are internally consistent (funnel ⊇ reached ⊇ completed) and
 * cover the #834 cases worth eyeballing:
 * - level 4 (the investigation) with no quiz, placements as clues, stars;
 * - scenario `no-level-4`: nobody reached the investigation yet.
 */
export type EditalMockScenario = "default" | "no-level-4";

interface LevelMock {
  reached: number;
  completed: number;
  quiz: { passed: number; total: number } | null;
  clues: number;
  stars: { avg: number; players: number };
}

const LEVELS: Record<string, LevelMock> = {
  level_01: {
    reached: 560,
    completed: 420,
    quiz: { passed: 420, total: 510 },
    clues: 1320,
    stars: { avg: 3.6, players: 420 },
  },
  level_02: {
    reached: 380,
    completed: 300,
    quiz: { passed: 300, total: 390 },
    clues: 980,
    stars: { avg: 3.1, players: 300 },
  },
  level_03: {
    reached: 250,
    completed: 200,
    quiz: { passed: 200, total: 240 },
    clues: 610,
    stars: { avg: 4.1, players: 200 },
  },
  level_04: {
    reached: 170,
    completed: 150,
    quiz: null,
    clues: 1850,
    stars: { avg: 3.9, players: 150 },
  },
};

const LANDING_PAGE_VIEWED = 1000;
const PLAY_CLICKED = 800;
const GAMEPLAY_STARTED = 600;

/** Share of every player who arrived through the institution's links. */
const INSTITUTIONAL_SHARE = 0.75;

function levelsFor(scenario: EditalMockScenario): Record<string, LevelMock> {
  if (scenario !== "no-level-4") return LEVELS;
  return {
    ...LEVELS,
    level_04: {
      reached: 0,
      completed: 0,
      quiz: null,
      clues: 0,
      stars: { avg: 0, players: 0 },
    },
  };
}

/**
 * The institution's turma/campaign links, from the back end. The slug
 * comes from a query's already-`resolveScope`'d binding, or from
 * EDITAL_MOCK_INSTITUTION for the public dashboard — this re-wraps it only
 * to read link names in local development, never to widen a query's scope.
 * A failure (e.g. no AUTH_OAUTH_UPSERT_TOKEN) reads as "no links yet".
 */
async function turmasOf(slug: string | undefined): Promise<string[]> {
  if (!slug) return [];
  try {
    const links = await listCampaignLinks(__createScopeForTests(slug));
    return links.map((link) => link.source);
  } catch (error) {
    console.warn("[mockData] Could not read campaign links", error);
    return [];
  }
}

/**
 * Each turma's share of the institution — uneven on purpose (the first
 * link gets the most), so switching turmas visibly changes the numbers.
 */
function turmaShares(turmas: string[]): Map<string, number> {
  const weights = turmas.map((_, index) => turmas.length - index);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return new Map(turmas.map((turma, index) => [turma, weights[index] / total]));
}

/** Everyone for the public dashboard; the institution's share, or one turma's, otherwise. */
function scaleFor(values: HogQLValues, shares: Map<string, number>): number {
  if (!values.slug) return 1;
  if (!values.source) return INSTITUTIONAL_SHARE;
  return INSTITUTIONAL_SHARE * (shares.get(String(values.source)) ?? 0);
}

function result(columns: string[], results: unknown[][]): HogQLQueryResult {
  return { columns, results };
}

function perLevel(
  levels: Record<string, LevelMock>,
  pick: (level: LevelMock) => unknown[] | null,
): unknown[][] {
  return Object.entries(levels).flatMap(([id, level]) => {
    const row = pick(level);
    return row ? [[id, ...row]] : [];
  });
}

/**
 * `windowFunnel` depth histogram — how many players stopped at each step,
 * derived from the same counts as everything else: landing, play, gameplay,
 * then one completion step per level.
 */
function funnelDepths(
  levels: Record<string, LevelMock>,
  scale: number,
): unknown[][] {
  const cumulative = [
    LANDING_PAGE_VIEWED,
    PLAY_CLICKED,
    GAMEPLAY_STARTED,
    ...Object.values(levels).map((level) => level.completed),
  ].map((count) => Math.round(count * scale));

  return cumulative.map((reached, index) => {
    const next = cumulative[index + 1] ?? 0;
    return [index + 1, reached - next];
  });
}

function lastMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index)),
    );
    return month.toISOString().slice(0, 10);
  });
}

export async function mockHogQLResult(
  query: string,
  values: HogQLValues,
  scenario: EditalMockScenario,
): Promise<HogQLQueryResult> {
  const slug = values.slug
    ? String(values.slug)
    : serverEnv.server.editalMockInstitution;
  const turmas = await turmasOf(slug);
  const shares = turmaShares(turmas);
  const levels = levelsFor(scenario);
  const scale = scaleFor(values, shares);
  const n = (count: number) => Math.round(count * scale);

  if (query.includes("avg(best_stars)")) {
    return result(
      ["level_id", "avg_stars", "players"],
      perLevel(levels, ({ stars }) =>
        stars.players > 0 ? [stars.avg, n(stars.players)] : null,
      ),
    );
  }

  if (query.includes("AS clues")) {
    return result(
      ["level_id", "clues"],
      perLevel(levels, (level) => (level.clues > 0 ? [n(level.clues)] : null)),
    );
  }

  if (query.includes("windowFunnel")) {
    return result(["depth", "players"], funnelDepths(levels, scale));
  }

  if (query.includes("AS level_1_completed")) {
    const completed = Object.values(levels).map((level) => n(level.completed));
    return result(
      [
        "started",
        ...completed.map((_, index) => `level_${index + 1}_completed`),
      ],
      [[n(GAMEPLAY_STARTED), ...completed]],
    );
  }

  if (query.includes("GROUP BY level_id") && query.includes("quiz_completed")) {
    return result(
      ["level_id", "passed", "total"],
      perLevel(levels, ({ quiz }) =>
        quiz ? [n(quiz.passed), n(quiz.total)] : null,
      ),
    );
  }

  if (query.includes("quiz_completed")) {
    const quizzes = Object.values(levels).flatMap((level) =>
      level.quiz ? [level.quiz] : [],
    );
    const passed = quizzes.reduce((sum, quiz) => sum + quiz.passed, 0);
    const total = quizzes.reduce((sum, quiz) => sum + quiz.total, 0);
    return result(["passed", "total"], [[n(passed), n(total)]]);
  }

  if (query.includes("'game_started', 'investigation_opened'")) {
    return result(
      ["level_id", "players"],
      perLevel(levels, (level) =>
        level.reached > 0 ? [n(level.reached)] : null,
      ),
    );
  }

  if (query.includes("AS started") && query.includes("AS completed")) {
    const final = Object.values(levels).at(-1)?.completed ?? 0;
    return result(["started", "completed"], [[n(GAMEPLAY_STARTED), n(final)]]);
  }

  if (query.includes("'level_completed', 'investigation_completed'")) {
    return result(
      ["level_id", "players"],
      perLevel(levels, (level) =>
        level.completed > 0 ? [n(level.completed)] : null,
      ),
    );
  }

  if (query.includes("avg_seconds")) {
    return result(
      ["avg_seconds", "median_seconds", "sessions_started"],
      [[1860, 1440, n(820)]],
    );
  }

  if (query.includes("toStartOfMonth")) {
    const months = lastMonths(6);
    return result(
      ["month", "players"],
      months.map((month, index) => [month, n(40 + index * 25)]),
    );
  }

  if (query.includes("AS institutional")) {
    const institutional = Math.round(GAMEPLAY_STARTED * INSTITUTIONAL_SHARE);
    return result(
      ["institutional", "spontaneous"],
      [[institutional, GAMEPLAY_STARTED - institutional]],
    );
  }

  if (query.includes("AS institutions")) {
    return result(["institutions"], [[1]]);
  }

  if (query.includes("AS turmas")) {
    return result(["turmas"], [[turmas.length]]);
  }

  // The institution's origins table: one row per turma/campaign link.
  if (query.includes("AS source")) {
    const institutional = LANDING_PAGE_VIEWED * INSTITUTIONAL_SHARE;
    return result(
      ["source", "unique_players"],
      turmas.map((turma) => [
        turma,
        Math.round(institutional * (shares.get(turma) ?? 0)),
      ]),
    );
  }

  if (query.includes("AS landing_page_viewed")) {
    return result(
      ["landing_page_viewed", "gameplay_started"],
      [[n(LANDING_PAGE_VIEWED), n(GAMEPLAY_STARTED)]],
    );
  }

  if (query.includes("AS players")) {
    return result(["players"], [[n(GAMEPLAY_STARTED)]]);
  }

  return result([], []);
}
