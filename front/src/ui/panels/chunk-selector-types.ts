import { LEVEL_ASSETS } from "@/game/data/LevelConfig";
import {
  type ChunkArrowDir,
  type ChunkCursorMode,
  ensureValidGridIndex,
  hasAnyFreeGridSlot,
  initChunkNavState,
  normalizeFilledSlots,
  reduceChunkNavOnArrow,
} from "@/game/objects/ui/chunkSelectorNavigation";

export type ChunkItem = { id: string; name: string; levelId: string };

export type ChunkSelectorMachineState = {
  cursorMode: ChunkCursorMode;
  selectedInventoryIndex: number;
  selectedGridIndex: number;
  pickedItemIndex: number | null;
  availableItems: ChunkItem[];
  slots: (string | null)[];
  usedInventoryIndices: (number | null)[];
  lockedSlots: boolean[];
  justPlacedSlots: number[];
};

export type ChunkSelectorAction =
  | {
      type: "RESET";
      payload: {
        availableItems: ChunkItem[];
        filledSlots: (string | null)[];
      };
    }
  | { type: "MOVE"; payload: ChunkArrowDir }
  | { type: "CONFIRM" }
  | { type: "CANCEL_PICK" }
  | {
      type: "DRAG_DROP";
      payload: { fromInventoryIndex: number; toSlotIndex: number };
    }
  | { type: "GRID_TO_INVENTORY"; payload: { slotIndex: number } }
  | {
      type: "GRID_TO_GRID";
      payload: { fromSlotIndex: number; toSlotIndex: number };
    }
  | { type: "LOCK_SLOTS"; payload: { indices: number[] } };

export const chunkAssetsByKey: Map<string, string> = new Map(
  (
    Object.values(LEVEL_ASSETS) as {
      CHUNKS: readonly { key: string; path: string }[];
    }[]
  ).flatMap((level) =>
    level.CHUNKS.map(
      (asset) => [asset.key, `/assets/${asset.path}`] as [string, string],
    ),
  ),
);

export function getChunkImageSrc(id: string): string {
  return chunkAssetsByKey.get(id) ?? `/assets/artworks/photos/${id}.png`;
}

export function buildInitialState(
  availableItems: ChunkItem[],
  filledSlots: (string | null)[],
): ChunkSelectorMachineState {
  const slots = normalizeFilledSlots(filledSlots);
  const lockedSlots = slots.map((slot) => Boolean(slot));

  const nav = initChunkNavState({
    inventoryCount: availableItems.length,
    lockedSlots,
  });

  return {
    cursorMode: nav.cursorMode,
    selectedInventoryIndex: nav.selectedInventoryIndex,
    selectedGridIndex: nav.selectedGridIndex,
    pickedItemIndex: null,
    availableItems,
    slots,
    usedInventoryIndices: [null, null, null, null],
    lockedSlots,
    justPlacedSlots: [],
  };
}

function freeInventoryIndices(
  usedInventoryIndices: (number | null)[],
  count: number,
): number[] {
  const usedSet = new Set(
    usedInventoryIndices.filter((x): x is number => x !== null),
  );
  return Array.from({ length: count }, (_, i) => i).filter(
    (i) => !usedSet.has(i),
  );
}

function nextFreeInventoryIndex(
  usedInventoryIndices: (number | null)[],
  count: number,
  preferred: number,
): number {
  const free = freeInventoryIndices(usedInventoryIndices, count);
  if (free.length === 0) return preferred;
  return free.find((i) => i >= preferred) ?? free[0];
}

export function reducer(
  state: ChunkSelectorMachineState,
  action: ChunkSelectorAction,
): ChunkSelectorMachineState {
  if (action.type === "RESET") {
    return buildInitialState(
      action.payload.availableItems,
      action.payload.filledSlots,
    );
  }

  if (action.type === "MOVE") {
    const free = freeInventoryIndices(
      state.usedInventoryIndices,
      state.availableItems.length,
    );
    const freeCount = free.length;

    const virtualCurrent = free.indexOf(state.selectedInventoryIndex);
    const safeVirtual = virtualCurrent === -1 ? 0 : virtualCurrent;

    const next = reduceChunkNavOnArrow(
      {
        cursorMode: state.cursorMode,
        selectedInventoryIndex: safeVirtual,
        selectedGridIndex: state.selectedGridIndex,
      },
      {
        inventoryCount: freeCount,
        lockedSlots: state.lockedSlots,
      },
      action.payload,
    );

    const nextOriginalIndex =
      next.cursorMode === "inventory"
        ? (free[next.selectedInventoryIndex] ?? state.selectedInventoryIndex)
        : next.selectedInventoryIndex;

    return {
      ...state,
      cursorMode: next.cursorMode,
      selectedInventoryIndex: nextOriginalIndex,
      selectedGridIndex: next.selectedGridIndex,
    };
  }

  if (action.type === "CANCEL_PICK") {
    return {
      ...state,
      pickedItemIndex: null,
      cursorMode: "inventory",
    };
  }

  if (action.type === "CONFIRM") {
    if (state.cursorMode === "inventory") {
      if (state.availableItems.length <= 0) return state;

      if (!hasAnyFreeGridSlot(state.lockedSlots)) {
        return {
          ...state,
          cursorMode: "confirm",
          pickedItemIndex: null,
        };
      }

      const isAlreadyUsed = state.usedInventoryIndices.includes(
        state.selectedInventoryIndex,
      );
      if (isAlreadyUsed) return state;

      return {
        ...state,
        pickedItemIndex: state.selectedInventoryIndex,
        cursorMode: "grid",
        selectedGridIndex: ensureValidGridIndex(
          state.selectedGridIndex,
          state.lockedSlots,
        ),
      };
    }

    if (state.cursorMode === "grid") {
      const gridIndex = ensureValidGridIndex(
        state.selectedGridIndex,
        state.lockedSlots,
      );
      if (state.lockedSlots[gridIndex]) return state;

      const nextSlots = [...state.slots];
      const nextUsed = [...state.usedInventoryIndices];

      if (state.pickedItemIndex !== null) {
        const item = state.availableItems[state.pickedItemIndex];
        if (!item) return state;

        nextSlots[gridIndex] = item.id;
        nextUsed[gridIndex] = state.pickedItemIndex;

        return {
          ...state,
          slots: nextSlots,
          usedInventoryIndices: nextUsed,
          pickedItemIndex: null,
          cursorMode: "inventory",
          selectedGridIndex: gridIndex,
          selectedInventoryIndex: nextFreeInventoryIndex(
            nextUsed,
            state.availableItems.length,
            state.selectedInventoryIndex,
          ),
        };
      }

      nextSlots[gridIndex] = null;
      nextUsed[gridIndex] = null;

      return {
        ...state,
        slots: nextSlots,
        usedInventoryIndices: nextUsed,
        selectedGridIndex: gridIndex,
      };
    }

    return state;
  }

  if (action.type === "DRAG_DROP") {
    const { fromInventoryIndex, toSlotIndex } = action.payload;
    if (state.lockedSlots[toSlotIndex]) return state;
    if (state.usedInventoryIndices[toSlotIndex] === fromInventoryIndex)
      return state;

    const item = state.availableItems[fromInventoryIndex];
    if (!item) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedInventoryIndices];

    const previousSlot = nextUsed.indexOf(fromInventoryIndex);
    if (previousSlot !== -1) {
      nextSlots[previousSlot] = null;
      nextUsed[previousSlot] = null;
    }

    nextSlots[toSlotIndex] = item.id;
    nextUsed[toSlotIndex] = fromInventoryIndex;

    return {
      ...state,
      slots: nextSlots,
      usedInventoryIndices: nextUsed,
      pickedItemIndex: null,
      cursorMode: "inventory",
      selectedInventoryIndex: nextFreeInventoryIndex(
        nextUsed,
        state.availableItems.length,
        state.selectedInventoryIndex,
      ),
    };
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

  if (action.type === "GRID_TO_INVENTORY") {
    const { slotIndex } = action.payload;
    if (state.lockedSlots[slotIndex]) return state;
    if (!state.slots[slotIndex]) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedInventoryIndices];
    nextSlots[slotIndex] = null;
    nextUsed[slotIndex] = null;

    return { ...state, slots: nextSlots, usedInventoryIndices: nextUsed };
  }

  if (action.type === "GRID_TO_GRID") {
    const { fromSlotIndex, toSlotIndex } = action.payload;
    if (fromSlotIndex === toSlotIndex) return state;
    if (state.lockedSlots[fromSlotIndex]) return state;
    if (state.lockedSlots[toSlotIndex]) return state;
    if (!state.slots[fromSlotIndex]) return state;

    const nextSlots = [...state.slots];
    const nextUsed = [...state.usedInventoryIndices];

    nextSlots[toSlotIndex] = nextSlots[fromSlotIndex];
    nextUsed[toSlotIndex] = nextUsed[fromSlotIndex];
    nextSlots[fromSlotIndex] = null;
    nextUsed[fromSlotIndex] = null;

    return { ...state, slots: nextSlots, usedInventoryIndices: nextUsed };
  }

  return state;
}
