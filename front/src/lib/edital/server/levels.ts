import {
  INVESTIGATION_LEVEL_ID,
  INVESTIGATION_LEVEL_NUMBER,
} from "../../../game/constants/Investigation";
import { MAP_MARKERS } from "../../../game/constants/MapMarkers";
import { LEVEL_REGISTRY } from "../../../game/data/LevelConfig";

/**
 * One level as the dashboards see it — its identity plus the HogQL
 * conditions that answer "reached", "completed" and "used a clue" for it.
 *
 * Levels 1–3 and the investigation (level 4) report the same facts through
 * different events, so each level carries its own conditions instead of the
 * queries special-casing level 4. Every condition is a compile-time string
 * built from constants here, never request input — the same safe pattern as
 * the event-name literals in queries.ts.
 */
export interface DashboardLevel {
  id: string;
  levelNumber: number;
  title: string;
  /** Event fired on every entry into the level, carrying `level_id`. */
  reachedEvent: string;
  /** Event fired when the level is finished, carrying `level_id` and `stars` (out of 5). */
  completedEvent: string;
  /** HogQL condition matching this level's completion — used by the funnel. */
  completedCondition: string;
  /** HogQL condition matching one clue interaction in this level. */
  clueCondition: string;
  /** Events only this level fires — lets old events lacking `level_id` map back. */
  exclusiveEvents: string[];
  /** Whether the level ends in a quiz; the investigation doesn't. */
  hasQuiz: boolean;
}

/**
 * Levels 1–3: `game_started` on entry, `level_completed` after the quiz,
 * and `clue_collected` for each clue picked up. `clue_used` is deliberately
 * not used: it fires when the game shows a hint automatically, not when the
 * player does anything with a clue.
 */
const PLAYABLE_LEVELS: DashboardLevel[] = Object.values(LEVEL_REGISTRY).map(
  (level) => ({
    id: level.id,
    levelNumber: level.levelNumber,
    title: level.title,
    reachedEvent: "game_started",
    completedEvent: "level_completed",
    completedCondition: `event = 'level_completed' AND toInt(properties.level_number) = ${level.levelNumber}`,
    clueCondition: `event = 'clue_collected' AND properties.level_id = '${level.id}'`,
    exclusiveEvents: [],
    hasQuiz: true,
  }),
);

/**
 * Level 4, the investigation — deliberately NOT in LEVEL_REGISTRY (no
 * tilemap; `Game.ts` and `LEVEL_ASSETS` iterate the registry), so it's added
 * here instead. Finishing it is finishing the game, in either ending: the
 * culprit named, or revealed after the last wrong accusation. Clues are the
 * ones placed on the board, every drop counted, the tutorial's scripted drop
 * excluded.
 */
const INVESTIGATION_LEVEL: DashboardLevel = {
  id: INVESTIGATION_LEVEL_ID,
  levelNumber: INVESTIGATION_LEVEL_NUMBER,
  title:
    MAP_MARKERS.find((marker) => marker.levelId === INVESTIGATION_LEVEL_ID)
      ?.title ?? INVESTIGATION_LEVEL_ID,
  reachedEvent: "investigation_opened",
  completedEvent: "investigation_completed",
  completedCondition: "event = 'investigation_completed'",
  clueCondition:
    "event = 'investigation_clue_placed' AND NOT coalesce(toBool(properties.is_tutorial), false)",
  exclusiveEvents: [
    "investigation_opened",
    "investigation_completed",
    "investigation_clue_placed",
  ],
  hasQuiz: false,
};

/**
 * Every level the dashboards report on, in play order. Shared by
 * queries.ts, globalQueries.ts, metrics.ts and globalMetrics.ts — HogQL
 * phase queries group by raw `level_id` (HogQL can't join this list), so
 * every caller mapping results back to something orderable/human-readable
 * needs this same sorted list. Client-safe data (no "server-only" in the
 * game constants), so importing it here creates no server/client boundary
 * issue.
 */
export const DASHBOARD_LEVELS: DashboardLevel[] = [
  ...PLAYABLE_LEVELS,
  INVESTIGATION_LEVEL,
].sort((a, b) => a.levelNumber - b.levelNumber);

/** The level whose completion means the game is finished. */
export const FINAL_LEVEL: DashboardLevel =
  DASHBOARD_LEVELS[DASHBOARD_LEVELS.length - 1];

function quoteList(values: string[]): string {
  return values.map((value) => `'${value}'`).join(", ");
}

function uniqueEvents(pick: (level: DashboardLevel) => string): string[] {
  return [...new Set(DASHBOARD_LEVELS.map(pick))];
}

/** `event IN (…)` over every level's reached event. */
export function reachedEventsPredicate(): string {
  return `event IN (${quoteList(uniqueEvents((l) => l.reachedEvent))})`;
}

/** `event IN (…)` over every level's completed event. */
export function completedEventsPredicate(): string {
  return `event IN (${quoteList(uniqueEvents((l) => l.completedEvent))})`;
}

/** Any level's clue condition, OR-ed. */
export function clueEventsPredicate(): string {
  return DASHBOARD_LEVELS.map((level) => `(${level.clueCondition})`).join(
    " OR ",
  );
}

/**
 * The level an event belongs to. Events only one level fires map to that
 * level even when they predate it sending `level_id` (the investigation's
 * first events didn't); everything else reads `properties.level_id`.
 */
export function levelIdExpression(): string {
  const branches = DASHBOARD_LEVELS.filter(
    (level) => level.exclusiveEvents.length > 0,
  ).map(
    (level) => `event IN (${quoteList(level.exclusiveEvents)}), '${level.id}'`,
  );
  if (branches.length === 0) return "properties.level_id";
  return `multiIf(${branches.join(", ")}, properties.level_id)`;
}

/**
 * Stars per level for whatever events `predicate` selects — shared by
 * queries.ts (one institution) and globalQueries.ts (everyone), which
 * differ only in that predicate. See buildPhaseStarsQuery for semantics.
 */
export function phaseStarsQuery(predicate: string): string {
  return `
SELECT
  level_id,
  avg(best_stars) AS avg_stars,
  count() AS players
FROM (
  SELECT
    ${levelIdExpression()} AS level_id,
    properties.anonymous_player_id AS player_id,
    max(toFloat(properties.stars)) AS best_stars
  FROM events
  WHERE ${predicate} AND ${completedEventsPredicate()} AND properties.stars IS NOT NULL
  GROUP BY level_id, player_id
)
GROUP BY level_id`.trim();
}
