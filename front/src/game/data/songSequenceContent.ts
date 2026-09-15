export interface SongSlot {
  bar: number;
  note: string | null;
}

export interface SongTrayItem {
  id: string;
  note: string;
}

export interface SongSequenceData {
  instanceId: string;
  slots: SongSlot[];
  tray: SongTrayItem[];
  blankIndices: number[];
  board: Record<number, string | null>;
  lockedSlots: number[];
}

/**
 * Persisted per placeholder instance (on `placeholder.state.songSequence`)
 * so the blanked notes and the player's placements survive closing and
 * reopening the panel within the same play session.
 */
export interface SongSequenceSessionState {
  blankIndices: number[];
  trayOrder: string[];
  board: Record<number, string | null>;
  lockedSlots: number[];
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

// Fixed decoys: never appear in the score, so they can never be "correct"
// wherever they're dropped — pure distractors in the tray.
const DECOY_NOTES = ["C3", "D4", "F4"];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Picks 3 note-bearing slot indices (never a Pause) to leave blank, each
 * with a distinct note letter — so two blanks never require the same
 * tray token.
 */
export function pickBlankIndices(slots: SongSlot[]): number[] {
  const candidates = shuffle(
    slots
      .map((slot, index) => ({ index, note: slot.note }))
      .filter((entry): entry is { index: number; note: string } =>
        Boolean(entry.note),
      ),
  );

  const seenNotes = new Set<string>();
  const picked: number[] = [];
  for (const candidate of candidates) {
    if (picked.length >= 3) break;
    if (seenNotes.has(candidate.note)) continue;
    seenNotes.add(candidate.note);
    picked.push(candidate.index);
  }
  // Keyboard/drag nav walks this array left-to-right; the grid always
  // renders by ascending slot index, so this must match or left/right
  // ends up going the wrong way.
  return picked.sort((a, b) => a - b);
}

function buildTrayItems(
  slots: SongSlot[],
  blankIndices: number[],
): SongTrayItem[] {
  const answerItems = blankIndices.map((index) => ({
    id: `blank-${index}`,
    note: slots[index].note as string,
  }));
  const decoyItems = DECOY_NOTES.map((note) => ({
    id: `decoy-${note}`,
    note,
  }));
  return shuffle([...answerItems, ...decoyItems]);
}

// Every tray token's note is derivable from its id alone (`blank-<slot
// index>` or `decoy-<note>`), so a persisted `trayOrder` can be replayed
// into the same tokens without re-shuffling.
function resolveTrayItems(
  slots: SongSlot[],
  trayOrder: string[],
): SongTrayItem[] {
  return trayOrder.map((id) => {
    if (id.startsWith("blank-")) {
      const index = Number(id.slice(6));
      return { id, note: slots[index].note as string };
    }
    return { id, note: id.slice(6) };
  });
}

export function buildSongSequenceData(
  instanceId: string,
  session?: SongSequenceSessionState,
): SongSequenceData {
  if (session) {
    return {
      instanceId,
      slots: SONG_SCORE,
      tray: resolveTrayItems(SONG_SCORE, session.trayOrder),
      blankIndices: session.blankIndices,
      board: session.board,
      lockedSlots: session.lockedSlots,
    };
  }

  const blankIndices = pickBlankIndices(SONG_SCORE);
  const board: Record<number, string | null> = {};
  for (const index of blankIndices) board[index] = null;

  return {
    instanceId,
    slots: SONG_SCORE,
    tray: buildTrayItems(SONG_SCORE, blankIndices),
    blankIndices,
    board,
    lockedSlots: [],
  };
}
