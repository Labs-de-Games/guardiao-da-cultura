import "server-only";
import { serverEnv } from "../../env-server";
import { listCampaignLinks } from "./campaignLinks";
import type { HogQLQueryResult, HogQLValues } from "./hogql";
import { ORDERED_LEVELS } from "./levels";
import { __createScopeForTests } from "./scope";

/**
 * Local-only stand-in for the PostHog Query API, so both edital dashboards
 * can be looked at without PostHog keys or real traffic. Enabled by
 * `EDITAL_MOCK_DATA=true` in development only — see env-server.ts's
 * `editalMockDataScenario()`, which refuses it under any other NODE_ENV.
 *
 * Everything above `runHogQLQuery` still runs for real (query builders,
 * metrics, routes, UI); only the HogQL response is canned. Queries are
 * recognised by the column aliases queries.ts/globalQueries.ts give them,
 * so a query this file doesn't know returns an empty result — the same
 * thing an empty period returns — rather than throwing.
 *
 * The base is ten hand-written players, each a list of `gameplay_started`
 * plays, so the numbers follow the selected period and cover every
 * first-touch case of #851: direct → link, link → direct, and a first
 * play from before the period. A player belongs to the institution only
 * if they entered through its link (first touch, as the client records
 * it). With the default 30-day period: 9 unique players = 5 institutional
 * + 4 direct.
 *
 * One institution: an institution query — it carries `slug` — gets the
 * institutional players, split across the institution's real turma/campaign
 * links (read from the back end, the same list the links page and turma
 * filter show). Every other metric is a fixed fraction of the scope's
 * players, so the numbers stay internally consistent (funnel ⊇ reached ⊇
 * completed) and institution + direct always equals the public total.
 */

interface MockPlay {
  daysAgo: number;
  /** Whether this play came through the institution's link. */
  link: boolean;
}

interface MockPlayer {
  id: string;
  plays: MockPlay[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const MOCK_PLAYERS: MockPlayer[] = [
  // Direct only.
  { id: "mock-p01", plays: [{ daysAgo: 5, link: false }] },
  {
    id: "mock-p02",
    plays: [
      { daysAgo: 10, link: false },
      { daysAgo: 3, link: false },
    ],
  },
  // Institutional only.
  { id: "mock-p03", plays: [{ daysAgo: 8, link: true }] },
  {
    id: "mock-p04",
    plays: [
      { daysAgo: 12, link: true },
      { daysAgo: 2, link: true },
    ],
  },
  // Direct first, link later → direct.
  {
    id: "mock-p05",
    plays: [
      { daysAgo: 20, link: false },
      { daysAgo: 4, link: true },
    ],
  },
  // Link first, direct later → institutional.
  {
    id: "mock-p06",
    plays: [
      { daysAgo: 15, link: true },
      { daysAgo: 6, link: false },
    ],
  },
  // Direct before a 30-day period, link inside it → direct.
  {
    id: "mock-p07",
    plays: [
      { daysAgo: 60, link: false },
      { daysAgo: 7, link: true },
    ],
  },
  // Link before a 30-day period, direct inside it → institutional.
  {
    id: "mock-p08",
    plays: [
      { daysAgo: 45, link: true },
      { daysAgo: 9, link: false },
    ],
  },
  // Only played before a 30-day period → not counted in it.
  { id: "mock-p09", plays: [{ daysAgo: 40, link: false }] },
  { id: "mock-p10", plays: [{ daysAgo: 1, link: true }] },
];

/** Per unique player who started gameplay. */
const LANDING_PER_PLAYER = 1.6;
const PLAY_CLICKED_PER_PLAYER = 1.2;
const SESSIONS_PER_PLAYER = 1.4;
const CLUES_PER_PLAYER_REACHED = 2;
const AVG_SESSION_SECONDS = 1500;
const MEDIAN_SESSION_SECONDS = 1200;
const TREND_MONTHS = [0.3, 0.6, 1];

/** Each level keeps fewer players than the one before. */
const LEVEL_STEP = 0.2;
const MIN_LEVEL_SHARE = 0.2;

interface Period {
  from: number;
  to: number;
}

function periodOf(values: HogQLValues): Period {
  return {
    from: new Date(String(values.from_ts)).getTime(),
    to: new Date(String(values.to_ts)).getTime(),
  };
}

/** Players with a play inside the period, each with whether their first-ever play (before `to`) was through the link. */
function activePlayers(period: Period, now: number) {
  return MOCK_PLAYERS.flatMap((player) => {
    const plays = player.plays
      .map((play) => ({ ...play, at: now - play.daysAgo * DAY_MS }))
      .filter((play) => play.at < period.to)
      .sort((a, b) => a.at - b.at);
    const playedInPeriod = plays.some((play) => play.at >= period.from);
    return playedInPeriod ? [{ enteredByLink: plays[0].link }] : [];
  });
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

function levelShares(index: number): { reached: number; completed: number } {
  const reached = Math.max(1 - LEVEL_STEP * index, MIN_LEVEL_SHARE);
  return { reached, completed: Math.max(reached - LEVEL_STEP, 0) };
}

function result(columns: string[], results: unknown[][]): HogQLQueryResult {
  return { columns, results };
}

export async function mockHogQLResult(
  query: string,
  values: HogQLValues,
  now: number = Date.now(),
): Promise<HogQLQueryResult> {
  const players = activePlayers(periodOf(values), now);
  const institutional = players.filter((player) => player.enteredByLink);

  const slug = values.slug
    ? String(values.slug)
    : serverEnv.server.editalMockInstitution;
  const turmas = await turmasOf(slug);
  const shares = turmaShares(turmas);

  // Everyone for the public dashboard; the institution's players, or one turma's share of them, otherwise.
  let base = players.length;
  if (values.slug) {
    base = values.source
      ? institutional.length * (shares.get(String(values.source)) ?? 0)
      : institutional.length;
  }
  const n = (share: number) => Math.round(base * share);

  const levels = ORDERED_LEVELS.map((level, index) => ({
    id: level.id,
    reached: n(levelShares(index).reached),
    completed: n(levelShares(index).completed),
  }));
  const landing = n(LANDING_PER_PLAYER);
  const gameplay = n(1);

  if (query.includes("windowFunnel")) {
    const cumulative = [
      landing,
      n(PLAY_CLICKED_PER_PLAYER),
      gameplay,
      ...levels.map((level) => level.completed),
    ];
    return result(
      ["depth", "players"],
      cumulative.map((reached, index) => [
        index + 1,
        reached - (cumulative[index + 1] ?? 0),
      ]),
    );
  }

  if (query.includes("AS level_1_completed")) {
    return result(
      ["started", ...levels.map((_, index) => `level_${index + 1}_completed`)],
      [[gameplay, ...levels.map((level) => level.completed)]],
    );
  }

  if (query.includes("GROUP BY level_id") && query.includes("quiz_completed")) {
    return result(
      ["level_id", "passed", "total"],
      levels.map((level) => [level.id, level.completed, level.reached]),
    );
  }

  if (query.includes("quiz_completed")) {
    const passed = levels.reduce((sum, level) => sum + level.completed, 0);
    const total = levels.reduce((sum, level) => sum + level.reached, 0);
    return result(["passed", "total"], [[passed, total]]);
  }

  if (query.includes("AS clue_uses")) {
    return result(
      ["level_id", "clue_uses"],
      levels.map((level) => [
        level.id,
        level.reached * CLUES_PER_PLAYER_REACHED,
      ]),
    );
  }

  if (query.includes("event = 'game_started'")) {
    return result(
      ["level_id", "players"],
      levels.map((level) => [level.id, level.reached]),
    );
  }

  if (query.includes("AND event = 'level_completed'")) {
    return result(
      ["level_id", "players"],
      levels.map((level) => [level.id, level.completed]),
    );
  }

  if (query.includes("AS started") && query.includes("AS completed")) {
    const final = levels.at(-1)?.completed ?? 0;
    return result(["started", "completed"], [[gameplay, final]]);
  }

  if (query.includes("avg_seconds")) {
    return result(
      ["avg_seconds", "median_seconds", "sessions_started"],
      [[AVG_SESSION_SECONDS, MEDIAN_SESSION_SECONDS, n(SESSIONS_PER_PLAYER)]],
    );
  }

  if (query.includes("toStartOfMonth")) {
    const current = new Date(now);
    return result(
      ["month", "players"],
      TREND_MONTHS.map((share, index) => {
        const month = new Date(
          Date.UTC(
            current.getUTCFullYear(),
            current.getUTCMonth() - (TREND_MONTHS.length - 1 - index),
          ),
        );
        return [month.toISOString().slice(0, 10), n(share)];
      }),
    );
  }

  if (query.includes("AS institutional")) {
    return result(
      ["institutional", "spontaneous"],
      [[institutional.length, players.length - institutional.length]],
    );
  }

  if (query.includes("AS institutions")) {
    return result(["institutions"], [[institutional.length > 0 ? 1 : 0]]);
  }

  if (query.includes("AS turmas")) {
    return result(["turmas"], [[turmas.length]]);
  }

  // The institution's origins table: one row per turma/campaign link.
  if (query.includes("AS source")) {
    return result(
      ["source", "unique_players"],
      turmas.map((turma) => [
        turma,
        Math.round(landing * (shares.get(turma) ?? 0)),
      ]),
    );
  }

  if (query.includes("AS landing_page_viewed")) {
    return result(
      ["landing_page_viewed", "gameplay_started"],
      [[landing, gameplay]],
    );
  }

  if (query.includes("AS players")) {
    return result(["players"], [[gameplay]]);
  }

  return result([], []);
}
