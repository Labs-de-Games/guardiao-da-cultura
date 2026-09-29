const CORRECT_MUSICIANS = new Set([
  "accordion",
  "jam_block",
  "triangle",
  "zabumba",
]);

// Static utility for the band musician-picker minigame — mirrors
// CostumeMechanicHandler's shape (no BaseMechanicHandler/MechanicsManager
// registration; correctness is checked client-side by BandSelectorPanel
// against the placeholder's `id`).
export const BandMechanicHandler = {
  getMusicianAsset(musicianId: string): string {
    const folder = CORRECT_MUSICIANS.has(musicianId) ? "correct" : "incorrect";
    return `/assets/band/${folder}/${musicianId}.png`;
  },

  shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
};
