import { LEVEL_REGISTRY } from "../../../game/data/LevelConfig";

/**
 * Shared by queries.ts, globalQueries.ts, metrics.ts and globalMetrics.ts —
 * HogQL phase queries group by raw `level_id` (HogQL can't join
 * LEVEL_REGISTRY), so every caller that needs to map results back to
 * something orderable/human-readable needs this same sorted list.
 * Client-safe data (LevelConfig.ts has no "server-only"), so importing it
 * here doesn't create a new server/client boundary issue.
 */
export const ORDERED_LEVELS = Object.values(LEVEL_REGISTRY).sort(
  (a, b) => a.levelNumber - b.levelNumber,
);

export const FINAL_LEVEL_NUMBER =
  ORDERED_LEVELS[ORDERED_LEVELS.length - 1]?.levelNumber ?? 1;
