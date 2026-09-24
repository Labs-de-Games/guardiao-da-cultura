/**
 * Suspect identification phase.
 *
 * The final phase is an investigation screen, not a playable level, so it is
 * deliberately NOT part of `LEVEL_REGISTRY` (it has no tilemap, and `Game.ts`
 * and `LEVEL_ASSETS` iterate the registry). It still borrows a level id so the
 * existing progression machinery works untouched:
 * - `MapInfoBox` parses `"level_04"` into "Fase 04" and reads
 *   `completedLevels["level_04"].stars` against its 5-star widget.
 * - `ProgressionManager.recordLevelCompleted` keeps `max(stars)`, which is what
 *   "preserve the best result" requires.
 * - `MapIntroScene.isMarkerAvailable` unlocks marker index 3 once finishing
 *   level_03 pushes `currentLevel` to 4.
 */
export const INVESTIGATION_LEVEL_ID = "level_04";

export const INVESTIGATION_LEVEL_NUMBER = 4;

/** The level that must be completed before the investigation unlocks. */
export const INVESTIGATION_PREREQUISITE_LEVEL_ID = "level_03";

/**
 * Stars awarded, indexed by how many wrong accusations came first.
 * The 5th entry is the consolation prize when the answer is revealed.
 */
export const INVESTIGATION_STARS_BY_WRONG_ATTEMPTS = [5, 4, 3, 2, 1] as const;

/** After this many wrong accusations the culprit is revealed automatically. */
export const INVESTIGATION_MAX_WRONG_ATTEMPTS = 4;

/**
 * Below this many genuinely collected clues, the curator supplies the rest from
 * her own files so a player who skipped the pickups can still reason it out.
 */
export const INVESTIGATION_MIN_CLUES = 4;

/**
 * Music volume while the identification phase is on screen.
 *
 * The phase is a reading screen — dossiers, alibis and clue text — so the score
 * sits back further than it does in a level. Applied on every entry, since the
 * phase's own mute button and any later change to the setting both leave it
 * somewhere else.
 */
export const INVESTIGATION_MUSIC_VOLUME = 0.3;

/** Clues a player can confront a single suspect with at once. */
export const INVESTIGATION_SLOTS = 3;

/**
 * Lives each clue has. Dropping a clue on a suspect grades it instantly and
 * costs one heart, so a single clue can interrogate at most three suspects.
 * Spending the last heart nails the clue to that suspect for good — the choice
 * of where to place it the third time is the one the player cannot take back.
 *
 * Hearts refill after a wrong accusation, which is what makes a failed guess a
 * fresh run at the board rather than a dead end.
 */
export const INVESTIGATION_CLUE_HEARTS = 3;

export function starsForWrongAttempts(wrongAttempts: number): number {
  const index = Math.min(
    Math.max(wrongAttempts, 0),
    INVESTIGATION_STARS_BY_WRONG_ATTEMPTS.length - 1,
  );
  return INVESTIGATION_STARS_BY_WRONG_ATTEMPTS[index];
}
