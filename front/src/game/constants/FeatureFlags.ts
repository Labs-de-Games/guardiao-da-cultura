/**
 * Feature Flags
 *
 * Toggle these constants to enable/disable in-development features.
 * Flip locally or in staging to test flows end-to-end before the feature
 * ships to production.
 */

/**
 * Levels that are playable by real players.
 *
 * A level id missing from this map is treated as disabled, so a new level
 * added to `LEVEL_REGISTRY` stays locked until it is explicitly listed here.
 *
 * Effects of disabling a level:
 * - its marker renders locked on the world map (`MapIntroScene.isMarkerAvailable`)
 * - finishing the previous level no longer advances into it; the player gets
 *   the "interest / notify-me" dialog instead (`UIScene` → `quiz:next-level`)
 */
export const LEVEL_ENABLED: Record<string, boolean> = {
  level_01: true,
  level_02: true,
  // Playable, but its curator dialogue and both quizzes are still placeholder
  // copy (see the `_comment` in each level_03 data file).
  level_03: false,
  // Suspect identification phase. Not a playable level (see
  // `constants/Investigation.ts`); it unlocks through the same flag +
  // `currentLevel` gate, once level_03 is completed.
  level_04: false,
};

export function isLevelEnabled(levelId: string): boolean {
  return LEVEL_ENABLED[levelId] === true;
}
