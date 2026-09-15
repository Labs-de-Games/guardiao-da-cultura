import type { SongSequenceOpenData } from "@/shared/events/game-events";
import {
  buildInitialState,
  reducer,
  type SongSequenceMachineState,
  unlockedBlankIndices,
  visibleTrayOrder,
} from "./song-sequence-types";

const DATA: SongSequenceOpenData = {
  instanceId: "PH_song",
  slots: [
    { bar: 0, note: "B3" },
    { bar: 0, note: "D3" },
    { bar: 0, note: null },
    { bar: 0, note: "A3" },
  ],
  tray: [
    { id: "blank-0", note: "B3" },
    { id: "blank-1", note: "D3" },
    { id: "decoy-C3", note: "C3" },
  ],
  blankIndices: [0, 1],
  board: {},
  lockedSlots: [],
};

function freshState(): SongSequenceMachineState {
  return buildInitialState(DATA);
}

describe("buildInitialState", () => {
  it("builds trayNoteById from every tray item", () => {
    const state = freshState();

    expect(state.trayNoteById).toEqual({
      "blank-0": "B3",
      "blank-1": "D3",
      "decoy-C3": "C3",
    });
  });

  it("seeds board only for blankIndices keys, defaulting missing entries to null", () => {
    const state = buildInitialState({ ...DATA, board: { 0: "blank-1" } });

    expect(state.board).toEqual({ 0: "blank-1", 1: null });
  });

  it("copies lockedSlots and starts with no grip, play focus, and zeroed indices", () => {
    const state = buildInitialState({ ...DATA, lockedSlots: [0] });

    expect(state.lockedSlots).toEqual([0]);
    expect(state.grippedId).toBeNull();
    expect(state.focusRow).toBe("play");
    expect(state.sequenceFocusIndex).toBe(0);
    expect(state.trayFocusIndex).toBe(0);
  });
});

describe("visibleTrayOrder", () => {
  it("hides a tray id currently placed on the board", () => {
    const state = { ...freshState(), board: { 0: "blank-1", 1: null } };

    expect(visibleTrayOrder(state)).toEqual(["blank-0", "decoy-C3"]);
  });

  it("shows everything when the board is empty", () => {
    expect(visibleTrayOrder(freshState())).toEqual([
      "blank-0",
      "blank-1",
      "decoy-C3",
    ]);
  });
});

describe("unlockedBlankIndices", () => {
  it("excludes locked indices", () => {
    const state = { ...freshState(), lockedSlots: [0] };

    expect(unlockedBlankIndices(state)).toEqual([1]);
  });
});

describe("MOVE", () => {
  it("clamps focusRow at both ends instead of wrapping", () => {
    const atStart = reducer(freshState(), { type: "MOVE", payload: "up" });
    expect(atStart.focusRow).toBe("play");

    const atEnd = reducer(
      { ...freshState(), focusRow: "confirm" },
      { type: "MOVE", payload: "down" },
    );
    expect(atEnd.focusRow).toBe("confirm");
  });

  it("walks play -> sequence -> tray -> confirm one row per press", () => {
    let state = freshState();
    state = reducer(state, { type: "MOVE", payload: "down" });
    expect(state.focusRow).toBe("sequence");
    state = reducer(state, { type: "MOVE", payload: "down" });
    expect(state.focusRow).toBe("tray");
    state = reducer(state, { type: "MOVE", payload: "down" });
    expect(state.focusRow).toBe("confirm");
  });

  it("wraps sequenceFocusIndex over unlockedBlankIndices length", () => {
    const state = { ...freshState(), focusRow: "sequence" as const };

    const right = reducer(
      { ...state, sequenceFocusIndex: 1 },
      { type: "MOVE", payload: "right" },
    );
    expect(right.sequenceFocusIndex).toBe(0);

    const left = reducer(
      { ...state, sequenceFocusIndex: 0 },
      { type: "MOVE", payload: "left" },
    );
    expect(left.sequenceFocusIndex).toBe(1);
  });

  it("wraps trayFocusIndex over visibleTrayOrder length", () => {
    const state = { ...freshState(), focusRow: "tray" as const };

    const right = reducer(
      { ...state, trayFocusIndex: 2 },
      { type: "MOVE", payload: "right" },
    );
    expect(right.trayFocusIndex).toBe(0);

    const left = reducer(
      { ...state, trayFocusIndex: 0 },
      { type: "MOVE", payload: "left" },
    );
    expect(left.trayFocusIndex).toBe(2);
  });

  it("is a no-op on play/confirm rows", () => {
    const play = freshState();
    expect(reducer(play, { type: "MOVE", payload: "left" })).toBe(play);

    const confirm = { ...freshState(), focusRow: "confirm" as const };
    expect(reducer(confirm, { type: "MOVE", payload: "right" })).toBe(confirm);
  });
});

describe("GRIP_TRAY", () => {
  it("grips the given id unconditionally, including re-gripping the same id", () => {
    const gripped = reducer(freshState(), {
      type: "GRIP_TRAY",
      payload: { id: "blank-0" },
    });
    expect(gripped.grippedId).toBe("blank-0");

    const regripped = reducer(gripped, {
      type: "GRIP_TRAY",
      payload: { id: "blank-0" },
    });
    expect(regripped.grippedId).toBe("blank-0");
  });
});

describe("PLACE_ON_SLOT", () => {
  it("places the gripped id into an unlocked blank slot and releases the grip", () => {
    const gripped = { ...freshState(), grippedId: "blank-0" };

    const next = reducer(gripped, {
      type: "PLACE_ON_SLOT",
      payload: { slotIndex: 1 },
    });

    expect(next.board[1]).toBe("blank-0");
    expect(next.grippedId).toBeNull();
  });

  it("overwrites whatever was already in that slot", () => {
    const gripped = {
      ...freshState(),
      board: { 0: "decoy-C3", 1: null },
      grippedId: "blank-1",
    };

    const next = reducer(gripped, {
      type: "PLACE_ON_SLOT",
      payload: { slotIndex: 0 },
    });

    expect(next.board[0]).toBe("blank-1");
  });

  it("no-ops with nothing gripped", () => {
    const state = freshState();
    expect(
      reducer(state, { type: "PLACE_ON_SLOT", payload: { slotIndex: 0 } }),
    ).toBe(state);
  });

  it("no-ops on a locked slot", () => {
    const state = { ...freshState(), grippedId: "blank-0", lockedSlots: [0] };
    expect(
      reducer(state, { type: "PLACE_ON_SLOT", payload: { slotIndex: 0 } }),
    ).toBe(state);
  });

  it("no-ops on a slot index that isn't a blank", () => {
    const state = { ...freshState(), grippedId: "blank-0" };
    expect(
      reducer(state, { type: "PLACE_ON_SLOT", payload: { slotIndex: 2 } }),
    ).toBe(state);
  });
});

describe("PICKUP_FROM_SLOT", () => {
  it("picks the note back up into the grip and empties the slot", () => {
    const state = { ...freshState(), board: { 0: "blank-0", 1: null } };

    const next = reducer(state, {
      type: "PICKUP_FROM_SLOT",
      payload: { slotIndex: 0 },
    });

    expect(next.board[0]).toBeNull();
    expect(next.grippedId).toBe("blank-0");
  });

  it("no-ops if something is already gripped", () => {
    const state = {
      ...freshState(),
      board: { 0: "blank-0", 1: null },
      grippedId: "blank-1",
    };
    expect(
      reducer(state, { type: "PICKUP_FROM_SLOT", payload: { slotIndex: 0 } }),
    ).toBe(state);
  });

  it("no-ops on a locked or already-empty slot", () => {
    const locked = {
      ...freshState(),
      board: { 0: "blank-0", 1: null },
      lockedSlots: [0],
    };
    expect(
      reducer(locked, { type: "PICKUP_FROM_SLOT", payload: { slotIndex: 0 } }),
    ).toBe(locked);

    const empty = freshState();
    expect(
      reducer(empty, { type: "PICKUP_FROM_SLOT", payload: { slotIndex: 1 } }),
    ).toBe(empty);
  });
});

describe("CANCEL_GRIP", () => {
  it("clears the grip without restoring it to any slot", () => {
    const state = { ...freshState(), board: { 0: "blank-0", 1: null } };
    const picked = reducer(state, {
      type: "PICKUP_FROM_SLOT",
      payload: { slotIndex: 0 },
    });

    const cancelled = reducer(picked, { type: "CANCEL_GRIP" });

    expect(cancelled.grippedId).toBeNull();
    expect(cancelled.board[0]).toBeNull();
  });
});

describe("FOCUS_SEQUENCE_SLOT", () => {
  it("focuses sequence row and resolves the given slot's position among unlocked blanks", () => {
    const state = freshState();

    const next = reducer(state, {
      type: "FOCUS_SEQUENCE_SLOT",
      payload: { slotIndex: 1 },
    });

    expect(next.focusRow).toBe("sequence");
    expect(next.sequenceFocusIndex).toBe(1);
  });

  it("falls back to focusRow-only when the slot isn't found", () => {
    const state = { ...freshState(), sequenceFocusIndex: 1 };

    const next = reducer(state, {
      type: "FOCUS_SEQUENCE_SLOT",
      payload: { slotIndex: 2 },
    });

    expect(next.focusRow).toBe("sequence");
    expect(next.sequenceFocusIndex).toBe(1);
  });
});

describe("FOCUS_TRAY_ITEM", () => {
  it("focuses tray row and resolves the given id's position among visible tray items", () => {
    const state = freshState();

    const next = reducer(state, {
      type: "FOCUS_TRAY_ITEM",
      payload: { id: "decoy-C3" },
    });

    expect(next.focusRow).toBe("tray");
    expect(next.trayFocusIndex).toBe(2);
  });

  it("falls back to focusRow-only when the id isn't found", () => {
    const state = { ...freshState(), trayFocusIndex: 1 };

    const next = reducer(state, {
      type: "FOCUS_TRAY_ITEM",
      payload: { id: "nonexistent" },
    });

    expect(next.focusRow).toBe("tray");
    expect(next.trayFocusIndex).toBe(1);
  });
});

describe("DRAG_TRAY_TO_SLOT", () => {
  it("places the tray id on the slot and clears any stale grippedId", () => {
    const state = { ...freshState(), grippedId: "decoy-C3" };

    const next = reducer(state, {
      type: "DRAG_TRAY_TO_SLOT",
      payload: { trayId: "blank-0", slotIndex: 1 },
    });

    expect(next.board[1]).toBe("blank-0");
    expect(next.grippedId).toBeNull();
  });

  it("no-ops on a locked slot", () => {
    const state = { ...freshState(), lockedSlots: [0] };
    expect(
      reducer(state, {
        type: "DRAG_TRAY_TO_SLOT",
        payload: { trayId: "blank-0", slotIndex: 0 },
      }),
    ).toBe(state);
  });

  it("no-ops on a non-blank slot", () => {
    const state = freshState();
    expect(
      reducer(state, {
        type: "DRAG_TRAY_TO_SLOT",
        payload: { trayId: "blank-0", slotIndex: 2 },
      }),
    ).toBe(state);
  });
});

describe("DRAG_SLOT_TO_TRAY", () => {
  it("empties the slot", () => {
    const state = { ...freshState(), board: { 0: "blank-0", 1: null } };

    const next = reducer(state, {
      type: "DRAG_SLOT_TO_TRAY",
      payload: { slotIndex: 0 },
    });

    expect(next.board[0]).toBeNull();
  });

  it("no-ops on a locked slot", () => {
    const state = {
      ...freshState(),
      board: { 0: "blank-0", 1: null },
      lockedSlots: [0],
    };
    expect(
      reducer(state, {
        type: "DRAG_SLOT_TO_TRAY",
        payload: { slotIndex: 0 },
      }),
    ).toBe(state);
  });
});

describe("DRAG_SLOT_TO_SLOT", () => {
  it("swaps the occupants of two filled slots", () => {
    const state = { ...freshState(), board: { 0: "blank-0", 1: "blank-1" } };

    const next = reducer(state, {
      type: "DRAG_SLOT_TO_SLOT",
      payload: { fromSlotIndex: 0, toSlotIndex: 1 },
    });

    expect(next.board).toEqual({ 0: "blank-1", 1: "blank-0" });
  });

  it("moves a note into an empty slot and leaves the source empty", () => {
    const state = { ...freshState(), board: { 0: "blank-0", 1: null } };

    const next = reducer(state, {
      type: "DRAG_SLOT_TO_SLOT",
      payload: { fromSlotIndex: 0, toSlotIndex: 1 },
    });

    expect(next.board).toEqual({ 0: null, 1: "blank-0" });
  });

  it("no-ops when from and to are the same index", () => {
    const state = { ...freshState(), board: { 0: "blank-0", 1: null } };
    expect(
      reducer(state, {
        type: "DRAG_SLOT_TO_SLOT",
        payload: { fromSlotIndex: 0, toSlotIndex: 0 },
      }),
    ).toBe(state);
  });

  it("no-ops when either end is locked", () => {
    const state = {
      ...freshState(),
      board: { 0: "blank-0", 1: null },
      lockedSlots: [1],
    };
    expect(
      reducer(state, {
        type: "DRAG_SLOT_TO_SLOT",
        payload: { fromSlotIndex: 0, toSlotIndex: 1 },
      }),
    ).toBe(state);
  });
});

describe("LOCK_SLOTS", () => {
  it("appends the given indices to lockedSlots", () => {
    const state = { ...freshState(), lockedSlots: [0] };

    const next = reducer(state, {
      type: "LOCK_SLOTS",
      payload: { indices: [1] },
    });

    expect(next.lockedSlots).toEqual([0, 1]);
  });

  it("does not dedup — locking an already-locked index twice appends it again", () => {
    const state = { ...freshState(), lockedSlots: [0] };

    const next = reducer(state, {
      type: "LOCK_SLOTS",
      payload: { indices: [0] },
    });

    expect(next.lockedSlots).toEqual([0, 0]);
  });
});
