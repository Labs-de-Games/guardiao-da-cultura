export interface SongSlot {
  bar: number;
  note: string | null;
}

export interface SongSequenceData {
  instanceId: string;
  slots: SongSlot[];
  tray: string[];
}

// From front/public/assets/sound/notes/score.txt:
// B3 - D3 - Pause - B3 | A3 - B3 - E3 - G3 | E3 - D3 - B3 - Pause
export const SONG_SCORE: SongSlot[] = [
  { bar: 0, note: "B3" },
  { bar: 0, note: "D3" },
  { bar: 0, note: null },
  { bar: 0, note: "B3" },
  { bar: 1, note: "A3" },
  { bar: 1, note: "B3" },
  { bar: 1, note: "E3" },
  { bar: 1, note: "G3" },
  { bar: 2, note: "E3" },
  { bar: 2, note: "D3" },
  { bar: 2, note: "B3" },
  { bar: 2, note: null },
];

// The 5 notes used in the score plus 3 unused distractors (C3, D4, F4).
export const NOTE_TRAY = ["C3", "D3", "E3", "G3", "A3", "B3", "D4", "F4"];

/**
 * Builds the shell payload for a `song_sequence` placeholder. Static for now —
 * no blank-selection/randomization logic yet, since drag-and-drop scoring is
 * out of scope for this pass.
 */
export function buildSongSequenceData(instanceId: string): SongSequenceData {
  return {
    instanceId,
    slots: SONG_SCORE,
    tray: NOTE_TRAY,
  };
}
