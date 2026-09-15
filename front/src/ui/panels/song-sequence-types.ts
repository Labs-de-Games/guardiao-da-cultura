import type { SongSequenceOpenData } from "@/shared/events/game-events";

export type SongFocusRow = "play" | "sequence" | "tray" | "confirm";
export type SongArrowDir = "up" | "down" | "left" | "right";

const FOCUS_ROWS: SongFocusRow[] = ["play", "sequence", "tray", "confirm"];

export interface SongSequenceMachineState {
  blankIndices: number[];
  trayOrder: string[];
  trayNoteById: Record<string, string>;
  board: Record<number, string | null>;
  lockedSlots: number[];
  grippedId: string | null;
  focusRow: SongFocusRow;
  sequenceFocusIndex: number;
  trayFocusIndex: number;
}

export type SongSequenceAction =
  | { type: "RESET"; payload: SongSequenceOpenData }
  | { type: "SET_FOCUS_ROW"; payload: SongFocusRow }
  | { type: "MOVE"; payload: SongArrowDir }
  | { type: "GRIP_TRAY"; payload: { id: string } }
  | { type: "PLACE_ON_SLOT"; payload: { slotIndex: number } }
  | { type: "PICKUP_FROM_SLOT"; payload: { slotIndex: number } }
  | { type: "CANCEL_GRIP" }
  | { type: "FOCUS_SEQUENCE_SLOT"; payload: { slotIndex: number } }
  | { type: "FOCUS_TRAY_ITEM"; payload: { id: string } }
  | {
      type: "DRAG_TRAY_TO_SLOT";
      payload: { trayId: string; slotIndex: number };
    }
  | { type: "DRAG_SLOT_TO_TRAY"; payload: { slotIndex: number } }
  | {
      type: "DRAG_SLOT_TO_SLOT";
      payload: { fromSlotIndex: number; toSlotIndex: number };
    }
  | { type: "LOCK_SLOTS"; payload: { indices: number[] } };

export function buildInitialState(
  data: SongSequenceOpenData,
): SongSequenceMachineState {
  const trayNoteById: Record<string, string> = {};
  for (const item of data.tray) trayNoteById[item.id] = item.note;

  const board: Record<number, string | null> = {};
  for (const index of data.blankIndices) {
    board[index] = data.board[index] ?? null;
  }

  return {
    blankIndices: data.blankIndices,
    trayOrder: data.tray.map((item) => item.id),
    trayNoteById,
    board,
    lockedSlots: [...data.lockedSlots],
    grippedId: null,
    focusRow: "play",
    sequenceFocusIndex: 0,
    trayFocusIndex: 0,
  };
}

function visibleTrayOrder(state: SongSequenceMachineState): string[] {
  const placed = new Set(Object.values(state.board).filter(Boolean));
  return state.trayOrder.filter((id) => !placed.has(id));
}

function unlockedBlankIndices(state: SongSequenceMachineState): number[] {
  return state.blankIndices.filter((i) => !state.lockedSlots.includes(i));
}

function clampIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

function wrapIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return ((index % length) + length) % length;
}

function moveFocusRow(current: SongFocusRow, direction: 1 | -1): SongFocusRow {
  const idx = FOCUS_ROWS.indexOf(current);
  return FOCUS_ROWS[clampIndex(idx + direction, FOCUS_ROWS.length)];
}

export function reducer(
  state: SongSequenceMachineState,
  action: SongSequenceAction,
): SongSequenceMachineState {
  switch (action.type) {
    case "RESET":
      return buildInitialState(action.payload);

    case "SET_FOCUS_ROW":
      return { ...state, focusRow: action.payload };

    case "MOVE": {
      if (action.payload === "up" || action.payload === "down") {
        const direction = action.payload === "up" ? -1 : 1;
        return {
          ...state,
          focusRow: moveFocusRow(state.focusRow, direction),
        };
      }

      const step = action.payload === "left" ? -1 : 1;

      if (state.focusRow === "sequence") {
        const unlocked = unlockedBlankIndices(state);
        return {
          ...state,
          sequenceFocusIndex: wrapIndex(
            state.sequenceFocusIndex + step,
            unlocked.length,
          ),
        };
      }

      if (state.focusRow === "tray") {
        const visible = visibleTrayOrder(state);
        return {
          ...state,
          trayFocusIndex: wrapIndex(
            state.trayFocusIndex + step,
            visible.length,
          ),
        };
      }

      return state;
    }

    case "GRIP_TRAY": {
      // Pressing the already-gripped note just replays its sound (handled
      // by the caller) — it stays gripped. Pressing a different note moves
      // the grip to it.
      return { ...state, grippedId: action.payload.id };
    }

    case "PLACE_ON_SLOT": {
      const { slotIndex } = action.payload;
      if (
        state.grippedId === null ||
        state.lockedSlots.includes(slotIndex) ||
        !(slotIndex in state.board)
      ) {
        return state;
      }

      return {
        ...state,
        board: { ...state.board, [slotIndex]: state.grippedId },
        grippedId: null,
      };
    }

    case "PICKUP_FROM_SLOT": {
      const { slotIndex } = action.payload;
      if (state.grippedId !== null) return state;
      if (state.lockedSlots.includes(slotIndex)) return state;
      const occupant = state.board[slotIndex];
      if (!occupant) return state;

      return {
        ...state,
        board: { ...state.board, [slotIndex]: null },
        grippedId: occupant,
      };
    }

    case "CANCEL_GRIP":
      return { ...state, grippedId: null };

    case "FOCUS_SEQUENCE_SLOT": {
      const index = unlockedBlankIndices(state).indexOf(
        action.payload.slotIndex,
      );
      if (index === -1) return { ...state, focusRow: "sequence" };
      return { ...state, focusRow: "sequence", sequenceFocusIndex: index };
    }

    case "FOCUS_TRAY_ITEM": {
      const index = visibleTrayOrder(state).indexOf(action.payload.id);
      if (index === -1) return { ...state, focusRow: "tray" };
      return { ...state, focusRow: "tray", trayFocusIndex: index };
    }

    case "DRAG_TRAY_TO_SLOT": {
      const { trayId, slotIndex } = action.payload;
      if (
        state.lockedSlots.includes(slotIndex) ||
        !(slotIndex in state.board)
      ) {
        return state;
      }
      return {
        ...state,
        board: { ...state.board, [slotIndex]: trayId },
        grippedId: null,
      };
    }

    case "DRAG_SLOT_TO_TRAY": {
      const { slotIndex } = action.payload;
      if (state.lockedSlots.includes(slotIndex)) return state;
      return {
        ...state,
        board: { ...state.board, [slotIndex]: null },
      };
    }

    case "DRAG_SLOT_TO_SLOT": {
      const { fromSlotIndex, toSlotIndex } = action.payload;
      if (fromSlotIndex === toSlotIndex) return state;
      if (
        state.lockedSlots.includes(fromSlotIndex) ||
        state.lockedSlots.includes(toSlotIndex)
      ) {
        return state;
      }

      return {
        ...state,
        board: {
          ...state.board,
          [toSlotIndex]: state.board[fromSlotIndex],
          [fromSlotIndex]: state.board[toSlotIndex],
        },
      };
    }

    case "LOCK_SLOTS":
      return {
        ...state,
        lockedSlots: [...state.lockedSlots, ...action.payload.indices],
      };

    default:
      return state;
  }
}

export { unlockedBlankIndices, visibleTrayOrder };
