const STORAGE_KEY = "gameplate:investigation:tutorial:v1";

/**
 * Whether the walkthrough has already run for this player.
 *
 * Kept in `localStorage` rather than progression because it is a preference of
 * the device, not a result: a guest who has seen it once should not be taught
 * it again, and nothing about it belongs in the saved game.
 */
export function hasSeenInvestigationTutorial(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode or a blocked store: teach it again rather than crash.
    return false;
  }
}

export function markInvestigationTutorialSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Nothing to do — the walkthrough simply replays next time.
  }
}
