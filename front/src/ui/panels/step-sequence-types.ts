export type StepCard = {
  id: string;
  name: string;
  imagePath: string;
};

export type StepSequenceData = {
  instanceId: string;
  videoPath: string;
  availableSteps: StepCard[];
  expectedSequence: string[];
  filledSlots?: (string | null)[];
};

export type StepSequenceCursorMode = "carousel" | "slots";

export type StepSequenceMachineState = {
  availableSteps: StepCard[];
  slots: (string | null)[];
  usedStepIndices: (number | null)[];
  lockedSlots: boolean[];
  justPlacedSlots: number[];
  attemptCount: number;
  cursorMode: StepSequenceCursorMode;
  selectedSlotIndex: number;
  heldCardIndex: number | null;
  sourceSlotIndex: number | null;
};

export type StepSequenceAction =
  | {
      type: "RESET";
      payload: {
        availableSteps: StepCard[];
        filledSlots: (string | null)[];
        slotCount: number;
      };
    }
  | { type: "NAVIGATE"; payload: "up" | "down" | "left" | "right" }
  | { type: "CONFIRM"; payload?: { carouselIndex?: number } }
  | { type: "CANCEL" }
  | {
      type: "DROP_STEP";
      payload: { fromStepIndex: number; toSlotIndex: number };
    }
  | {
      type: "SLOT_TO_SLOT";
      payload: { fromSlotIndex: number; toSlotIndex: number };
    }
  | { type: "CLEAR_SLOT"; payload: { slotIndex: number } }
  | { type: "LOCK_SLOTS"; payload: { indices: number[] } }
  | { type: "SUBMIT_ATTEMPT" };

export type DragIdPrefix = "step" | "slot" | "seq";

/**
 * Drag ids encode where a card came from and where it landed:
 * `step-<i>` carousel card, `slot-<i>` drop target, `seq-<i>` card sitting
 * in a slot. The literal id `carousel` is the drop-back-out zone.
 */
export function parseDragId(
  id: string,
): { prefix: DragIdPrefix; index: number } | null {
  if (id.startsWith("step-"))
    return { prefix: "step", index: Number(id.slice(5)) };
  if (id.startsWith("slot-"))
    return { prefix: "slot", index: Number(id.slice(5)) };
  if (id.startsWith("seq-"))
    return { prefix: "seq", index: Number(id.slice(4)) };
  return null;
}

export function resolveDragEnd(
  activeId: string,
  overId: string,
): StepSequenceAction | null {
  const from = parseDragId(activeId);
  const to = parseDragId(overId);

  if (from?.prefix === "step" && to?.prefix === "slot") {
    return {
      type: "DROP_STEP",
      payload: { fromStepIndex: from.index, toSlotIndex: to.index },
    };
  }

  if (from?.prefix === "seq" && to?.prefix === "slot") {
    return {
      type: "SLOT_TO_SLOT",
      payload: { fromSlotIndex: from.index, toSlotIndex: to.index },
    };
  }

  if (from?.prefix === "seq" && overId === "carousel") {
    return { type: "CLEAR_SLOT", payload: { slotIndex: from.index } };
  }

  return null;
}

/**
 * Splits the still-unlocked slots into the ones matching the expected order
 * and the ones that do not. Already-locked slots are settled and skipped.
 */
export function evaluateSequence(
  slots: (string | null)[],
  lockedSlots: boolean[],
  expectedSequence: string[],
): { correctIndices: number[]; wrongIndices: number[] } {
  const correctIndices: number[] = [];
  const wrongIndices: number[] = [];

  for (let i = 0; i < slots.length; i++) {
    if (lockedSlots[i]) continue;
    const placed = slots[i];
    if (placed && placed === expectedSequence[i]) {
      correctIndices.push(i);
    } else {
      wrongIndices.push(i);
    }
  }

  return { correctIndices, wrongIndices };
}

export function getStepImageSrc(card: StepCard): string {
  return card.imagePath;
}

export function normalizeFilledSlots(
  filledSlots: (string | null)[],
  slotCount: number,
): (string | null)[] {
  return Array.from({ length: slotCount }, (_, i) => filledSlots[i] ?? null);
}

export function buildInitialState(
  availableSteps: StepCard[],
  filledSlots: (string | null)[],
  slotCount: number,
): StepSequenceMachineState {
  const slots = normalizeFilledSlots(filledSlots, slotCount);

  return {
    availableSteps,
    slots,
    // Prefilled slots must claim their card, or the carousel keeps offering a
    // frame that is already locked into the board and it can be placed twice.
    // findIndex returning -1 for an unknown id is harmless: includes(-1) never
    // matches a real card index.
    usedStepIndices: slots.map((slot) =>
      slot ? availableSteps.findIndex((card) => card.id === slot) : null,
    ),
    lockedSlots: slots.map((slot) => Boolean(slot)),
    justPlacedSlots: [],
    // Per panel session: RESET runs on mount, so this counts attempts within
    // one open. Cross-session totals live in ScoreManager's floor errors.
    attemptCount: 0,
    cursorMode: "carousel",
    selectedSlotIndex: 0,
    heldCardIndex: null,
    sourceSlotIndex: null,
  };
}

export function isStepUsed(
  state: StepSequenceMachineState,
  stepIndex: number,
): boolean {
  return state.usedStepIndices.includes(stepIndex);
}

export function reducer(
  state: StepSequenceMachineState,
  action: StepSequenceAction,
): StepSequenceMachineState {
  if (action.type === "RESET") {
    return buildInitialState(
      action.payload.availableSteps,
      action.payload.filledSlots,
      action.payload.slotCount,
    );
  }

  if (action.type === "NAVIGATE") {
    const dir = action.payload;

    if (state.cursorMode === "carousel") {
      if (dir === "down") {
        return { ...state, cursorMode: "slots", selectedSlotIndex: 0 };
      }
      return state;
    }

    if (state.cursorMode === "slots") {
      if (dir === "up") {
        return {
          ...state,
          cursorMode: "carousel",
          heldCardIndex: null,
          sourceSlotIndex: null,
        };
      }
      if (dir === "left" && state.selectedSlotIndex > 0) {
        return { ...state, selectedSlotIndex: state.selectedSlotIndex - 1 };
      }
      if (dir === "right" && state.selectedSlotIndex < state.slots.length - 1) {
        return { ...state, selectedSlotIndex: state.selectedSlotIndex + 1 };
      }
      return state;
    }

    return state;
  }

  if (action.type === "CONFIRM") {
    if (state.cursorMode === "carousel" && state.heldCardIndex === null) {
      const carouselIdx = action.payload?.carouselIndex ?? 0;
      const availableCards = state.availableSteps.filter(
        (_, i) => !state.usedStepIndices.includes(i),
      );
      const visibleCard = availableCards[carouselIdx];
      if (!visibleCard) return state;
      const originalIndex = state.availableSteps.indexOf(visibleCard);
      return {
        ...state,
        heldCardIndex: originalIndex,
        cursorMode: "slots",
      };
    }

    if (state.cursorMode === "slots" && state.heldCardIndex !== null) {
      const toSlotIndex = state.selectedSlotIndex;
      if (state.lockedSlots[toSlotIndex]) return state;

      const fromStepIndex = state.heldCardIndex;
      const card = state.availableSteps[fromStepIndex];
      if (!card) return state;
      if (state.usedStepIndices[toSlotIndex] === fromStepIndex) return state;

      const nextSlots = [...state.slots];
      const nextUsed = [...state.usedStepIndices];

      const targetStepId = state.slots[toSlotIndex];

      if (
        targetStepId &&
        state.sourceSlotIndex !== null &&
        state.sourceSlotIndex !== toSlotIndex
      ) {
        const targetCardIndex = state.availableSteps.findIndex(
          (c) => c.id === targetStepId,
        );
        nextSlots[state.sourceSlotIndex] = targetStepId;
        nextUsed[state.sourceSlotIndex] = targetCardIndex;
      } else {
        const previousSlot = nextUsed.indexOf(fromStepIndex);
        if (previousSlot !== -1) {
          nextSlots[previousSlot] = null;
          nextUsed[previousSlot] = null;
        }
      }

      nextSlots[toSlotIndex] = card.id;
      nextUsed[toSlotIndex] = fromStepIndex;

      return {
        ...state,
        slots: nextSlots,
        usedStepIndices: nextUsed,
        heldCardIndex: null,
        sourceSlotIndex: null,
        cursorMode: "slots",
      };
    }

    if (state.cursorMode === "slots" && state.heldCardIndex === null) {
      const slotIndex = state.selectedSlotIndex;
      if (state.lockedSlots[slotIndex]) return state;
      const stepId = state.slots[slotIndex];
      if (!stepId) return state;

      const idx = state.availableSteps.findIndex((c) => c.id === stepId);
      if (idx < 0) return state;

      const nextSlots = [...state.slots];
      const nextUsed = [...state.usedStepIndices];
      nextSlots[slotIndex] = null;
      nextUsed[slotIndex] = null;

      return {
        ...state,
        slots: nextSlots,
        usedStepIndices: nextUsed,
        heldCardIndex: idx,
        sourceSlotIndex: slotIndex,
        cursorMode: "slots",
      };
    }

    return state;
  }

  if (action.type === "CANCEL") {
    if (state.heldCardIndex !== null && state.sourceSlotIndex !== null) {
      const card = state.availableSteps[state.heldCardIndex];
      if (card) {
        const nextSlots = [...state.slots];
        const nextUsed = [...state.usedStepIndices];
        nextSlots[state.sourceSlotIndex] = card.id;
        nextUsed[state.sourceSlotIndex] = state.heldCardIndex;
        return {
          ...state,
          slots: nextSlots,
          usedStepIndices: nextUsed,
          heldCardIndex: null,
          sourceSlotIndex: null,
        };
      }
    }
    return {
      ...state,
      heldCardIndex: null,
      sourceSlotIndex: null,
      cursorMode: "carousel",
    };
  }

  if (action.type === "DROP_STEP") {
    const { fromStepIndex, toSlotIndex } = action.payload;
    if (state.lockedSlots[toSlotIndex]) return state;

    const card = state.availableSteps[fromStepIndex];
    if (!card) return state;
    if (state.usedStepIndices[toSlotIndex] === fromStepIndex) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedStepIndices];

    const previousSlot = nextUsed.indexOf(fromStepIndex);
    if (previousSlot !== -1) {
      nextSlots[previousSlot] = null;
      nextUsed[previousSlot] = null;
    }

    nextSlots[toSlotIndex] = card.id;
    nextUsed[toSlotIndex] = fromStepIndex;

    return { ...state, slots: nextSlots, usedStepIndices: nextUsed };
  }

  if (action.type === "SLOT_TO_SLOT") {
    const { fromSlotIndex, toSlotIndex } = action.payload;
    if (fromSlotIndex === toSlotIndex) return state;
    if (state.lockedSlots[fromSlotIndex]) return state;
    if (state.lockedSlots[toSlotIndex]) return state;
    if (!state.slots[fromSlotIndex]) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedStepIndices];

    // Swap rather than move, so dropping onto an occupied slot never
    // silently discards the card that was already there.
    nextSlots[toSlotIndex] = state.slots[fromSlotIndex];
    nextUsed[toSlotIndex] = state.usedStepIndices[fromSlotIndex];
    nextSlots[fromSlotIndex] = state.slots[toSlotIndex];
    nextUsed[fromSlotIndex] = state.usedStepIndices[toSlotIndex];

    return { ...state, slots: nextSlots, usedStepIndices: nextUsed };
  }

  if (action.type === "CLEAR_SLOT") {
    const { slotIndex } = action.payload;
    if (state.lockedSlots[slotIndex]) return state;
    if (!state.slots[slotIndex]) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedStepIndices];
    nextSlots[slotIndex] = null;
    nextUsed[slotIndex] = null;

    return { ...state, slots: nextSlots, usedStepIndices: nextUsed };
  }

  if (action.type === "SUBMIT_ATTEMPT") {
    return { ...state, attemptCount: state.attemptCount + 1 };
  }

  if (action.type === "LOCK_SLOTS") {
    const nextLocked = [...state.lockedSlots];
    for (const i of action.payload.indices) {
      nextLocked[i] = true;
    }
    return {
      ...state,
      lockedSlots: nextLocked,
      justPlacedSlots: [...state.justPlacedSlots, ...action.payload.indices],
    };
  }

  return state;
}
