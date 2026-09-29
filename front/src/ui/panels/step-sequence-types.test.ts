import {
  buildInitialState,
  evaluateSequence,
  isStepUsed,
  reducer,
  resolveDragEnd,
  type StepCard,
  type StepSequenceMachineState,
} from "./step-sequence-types";

const CARDS: StepCard[] = [
  { id: "anel", name: "Anel", imagePath: "/a.png" },
  { id: "balanceio", name: "Balanceio", imagePath: "/b.png" },
  { id: "caminho", name: "Caminho", imagePath: "/c.png" },
  { id: "dama", name: "Dama", imagePath: "/d.png" },
];

function freshState(slotCount = 4): StepSequenceMachineState {
  return buildInitialState(CARDS, [], slotCount);
}

describe("buildInitialState", () => {
  it("sizes the slots from slotCount, not from the card list", () => {
    const state = buildInitialState(CARDS, [], 3);

    expect(state.slots).toEqual([null, null, null]);
    expect(state.lockedSlots).toEqual([false, false, false]);
  });

  it("locks slots that arrive prefilled", () => {
    const state = buildInitialState(CARDS, ["anel", null, null, null], 4);

    expect(state.slots).toEqual(["anel", null, null, null]);
    expect(state.lockedSlots).toEqual([true, false, false, false]);
  });

  it("claims the card of a prefilled slot so the carousel stops offering it", () => {
    const state = buildInitialState(CARDS, [null, "caminho", null, null], 4);

    expect(state.usedStepIndices).toEqual([null, 2, null, null]);
    expect(isStepUsed(state, 2)).toBe(true);
    expect(isStepUsed(state, 0)).toBe(false);
  });

  it("tolerates a saved id that is no longer in the card list", () => {
    const state = buildInitialState(CARDS, ["removido", null, null, null], 4);

    expect(state.slots[0]).toBe("removido");
    expect(CARDS.some((_, i) => isStepUsed(state, i))).toBe(false);
  });

  it("pads a short filledSlots array up to slotCount", () => {
    const state = buildInitialState(CARDS, ["anel"], 4);

    expect(state.slots).toEqual(["anel", null, null, null]);
  });
});

describe("DROP_STEP", () => {
  it("places a card into an empty slot", () => {
    const next = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 1, toSlotIndex: 2 },
    });

    expect(next.slots).toEqual([null, null, "balanceio", null]);
    expect(next.usedStepIndices).toEqual([null, null, 1, null]);
    expect(isStepUsed(next, 1)).toBe(true);
  });

  it("vacates the card's previous slot instead of duplicating it", () => {
    const placed = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 1, toSlotIndex: 0 },
    });
    const moved = reducer(placed, {
      type: "DROP_STEP",
      payload: { fromStepIndex: 1, toSlotIndex: 3 },
    });

    expect(moved.slots).toEqual([null, null, null, "balanceio"]);
    expect(moved.usedStepIndices).toEqual([null, null, null, 1]);
  });

  it("overwrites the card already sitting in the target slot", () => {
    const first = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 1 },
    });
    const second = reducer(first, {
      type: "DROP_STEP",
      payload: { fromStepIndex: 2, toSlotIndex: 1 },
    });

    expect(second.slots).toEqual([null, "caminho", null, null]);
    expect(isStepUsed(second, 0)).toBe(false);
  });

  it("no-ops on a locked slot", () => {
    const locked = reducer(freshState(), {
      type: "LOCK_SLOTS",
      payload: { indices: [0] },
    });
    const next = reducer(locked, {
      type: "DROP_STEP",
      payload: { fromStepIndex: 1, toSlotIndex: 0 },
    });

    expect(next).toBe(locked);
  });

  it("no-ops for a card index that does not exist", () => {
    const state = freshState();
    const next = reducer(state, {
      type: "DROP_STEP",
      payload: { fromStepIndex: 99, toSlotIndex: 0 },
    });

    expect(next).toBe(state);
  });
});

describe("SLOT_TO_SLOT", () => {
  it("swaps two filled slots so neither card is lost", () => {
    let state = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 0 },
    });
    state = reducer(state, {
      type: "DROP_STEP",
      payload: { fromStepIndex: 1, toSlotIndex: 1 },
    });

    const swapped = reducer(state, {
      type: "SLOT_TO_SLOT",
      payload: { fromSlotIndex: 0, toSlotIndex: 1 },
    });

    expect(swapped.slots).toEqual(["balanceio", "anel", null, null]);
    expect(swapped.usedStepIndices).toEqual([1, 0, null, null]);
  });

  it("moves into an empty slot and leaves the source empty", () => {
    const state = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 0 },
    });

    const moved = reducer(state, {
      type: "SLOT_TO_SLOT",
      payload: { fromSlotIndex: 0, toSlotIndex: 2 },
    });

    expect(moved.slots).toEqual([null, null, "anel", null]);
    expect(moved.usedStepIndices).toEqual([null, null, 0, null]);
  });

  it("no-ops when either end is locked", () => {
    let state = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 0 },
    });
    state = reducer(state, {
      type: "DROP_STEP",
      payload: { fromStepIndex: 1, toSlotIndex: 1 },
    });
    state = reducer(state, { type: "LOCK_SLOTS", payload: { indices: [1] } });

    expect(
      reducer(state, {
        type: "SLOT_TO_SLOT",
        payload: { fromSlotIndex: 0, toSlotIndex: 1 },
      }),
    ).toBe(state);
    expect(
      reducer(state, {
        type: "SLOT_TO_SLOT",
        payload: { fromSlotIndex: 1, toSlotIndex: 2 },
      }),
    ).toBe(state);
  });

  it("no-ops when the source slot is empty or is the target", () => {
    const state = freshState();

    expect(
      reducer(state, {
        type: "SLOT_TO_SLOT",
        payload: { fromSlotIndex: 0, toSlotIndex: 1 },
      }),
    ).toBe(state);
    expect(
      reducer(state, {
        type: "SLOT_TO_SLOT",
        payload: { fromSlotIndex: 0, toSlotIndex: 0 },
      }),
    ).toBe(state);
  });
});

describe("CLEAR_SLOT", () => {
  it("empties a slot and frees its card for reuse", () => {
    const state = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 2, toSlotIndex: 1 },
    });

    const cleared = reducer(state, {
      type: "CLEAR_SLOT",
      payload: { slotIndex: 1 },
    });

    expect(cleared.slots).toEqual([null, null, null, null]);
    expect(isStepUsed(cleared, 2)).toBe(false);
  });

  it("no-ops on a locked or already-empty slot", () => {
    const state = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 0 },
    });
    const locked = reducer(state, {
      type: "LOCK_SLOTS",
      payload: { indices: [0] },
    });

    expect(
      reducer(locked, { type: "CLEAR_SLOT", payload: { slotIndex: 0 } }),
    ).toBe(locked);
    expect(
      reducer(state, { type: "CLEAR_SLOT", payload: { slotIndex: 3 } }),
    ).toBe(state);
  });
});

describe("LOCK_SLOTS", () => {
  it("locks the given slots and records them as just placed", () => {
    const next = reducer(freshState(), {
      type: "LOCK_SLOTS",
      payload: { indices: [0, 2] },
    });

    expect(next.lockedSlots).toEqual([true, false, true, false]);
    expect(next.justPlacedSlots).toEqual([0, 2]);
  });
});

describe("SUBMIT_ATTEMPT", () => {
  it("starts at zero and counts each submit", () => {
    expect(freshState().attemptCount).toBe(0);

    let state = reducer(freshState(), { type: "SUBMIT_ATTEMPT" });
    expect(state.attemptCount).toBe(1);

    state = reducer(state, { type: "SUBMIT_ATTEMPT" });
    expect(state.attemptCount).toBe(2);
  });

  it("leaves the board untouched", () => {
    const placed = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 0 },
    });

    const counted = reducer(placed, { type: "SUBMIT_ATTEMPT" });

    expect(counted.slots).toEqual(placed.slots);
    expect(counted.usedStepIndices).toEqual(placed.usedStepIndices);
    expect(counted.lockedSlots).toEqual(placed.lockedSlots);
  });

  it("restarts the count on RESET", () => {
    const counted = reducer(freshState(), { type: "SUBMIT_ATTEMPT" });

    const reset = reducer(counted, {
      type: "RESET",
      payload: { availableSteps: CARDS, filledSlots: [], slotCount: 4 },
    });

    expect(reset.attemptCount).toBe(0);
  });
});

describe("RESET", () => {
  it("discards all placement progress", () => {
    const dirty = reducer(freshState(), {
      type: "DROP_STEP",
      payload: { fromStepIndex: 0, toSlotIndex: 0 },
    });

    const next = reducer(dirty, {
      type: "RESET",
      payload: { availableSteps: CARDS, filledSlots: [], slotCount: 4 },
    });

    expect(next.slots).toEqual([null, null, null, null]);
    expect(next.usedStepIndices).toEqual([null, null, null, null]);
    expect(next.justPlacedSlots).toEqual([]);
  });
});

describe("resolveDragEnd", () => {
  it("maps a carousel card dropped on a slot to DROP_STEP", () => {
    expect(resolveDragEnd("step-2", "slot-0")).toEqual({
      type: "DROP_STEP",
      payload: { fromStepIndex: 2, toSlotIndex: 0 },
    });
  });

  it("maps a slot card dropped on another slot to SLOT_TO_SLOT", () => {
    expect(resolveDragEnd("seq-1", "slot-3")).toEqual({
      type: "SLOT_TO_SLOT",
      payload: { fromSlotIndex: 1, toSlotIndex: 3 },
    });
  });

  it("maps a slot card dropped back on the carousel to CLEAR_SLOT", () => {
    expect(resolveDragEnd("seq-1", "carousel")).toEqual({
      type: "CLEAR_SLOT",
      payload: { slotIndex: 1 },
    });
  });

  it("returns null for combinations that mean nothing", () => {
    expect(resolveDragEnd("step-0", "carousel")).toBeNull();
    expect(resolveDragEnd("step-0", "step-1")).toBeNull();
    expect(resolveDragEnd("bogus", "slot-0")).toBeNull();
  });
});

describe("evaluateSequence", () => {
  const expected = ["anel", "balanceio", "caminho"];

  it("reports every unlocked slot that matches the expected order", () => {
    expect(
      evaluateSequence(
        ["anel", "balanceio", "caminho"],
        [false, false, false],
        expected,
      ),
    ).toEqual({ correctIndices: [0, 1, 2], wrongIndices: [] });
  });

  it("counts an empty slot as wrong", () => {
    expect(
      evaluateSequence(
        ["anel", null, "caminho"],
        [false, false, false],
        expected,
      ),
    ).toEqual({ correctIndices: [0, 2], wrongIndices: [1] });
  });

  it("counts a right card in the wrong position as wrong", () => {
    expect(
      evaluateSequence(
        ["balanceio", "anel", "caminho"],
        [false, false, false],
        expected,
      ),
    ).toEqual({ correctIndices: [2], wrongIndices: [0, 1] });
  });

  it("skips slots that are already locked", () => {
    expect(
      evaluateSequence(
        ["anel", "dama", "caminho"],
        [true, false, true],
        expected,
      ),
    ).toEqual({ correctIndices: [], wrongIndices: [1] });
  });
});
