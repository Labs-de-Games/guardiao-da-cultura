export type ChunkCursorMode = "inventory" | "grid" | "confirm";

export type ChunkArrowDir = "up" | "down" | "left" | "right";

export type ChunkNavState = {
  cursorMode: ChunkCursorMode;
  selectedInventoryIndex: number;
  selectedGridIndex: number;
};

export type ChunkNavContext = {
  inventoryCount: number;
  lockedSlots: boolean[]; // length: 4 (2x2)
};

const GRID_COLS = 2;
const GRID_SIZE = 4;

function clampIndex(index: number, maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  if (index < 0) return 0;
  if (index >= maxExclusive) return maxExclusive - 1;
  return index;
}

function rowOf(index: number): number {
  return Math.floor(index / GRID_COLS);
}

function colOf(index: number): number {
  return index % GRID_COLS;
}

function manhattan(a: number, b: number): number {
  return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));
}

export function normalizeFilledSlots(
  filledSlots: Array<string | null | undefined>,
): (string | null)[] {
  const normalized: (string | null)[] = new Array(GRID_SIZE).fill(null);
  for (let i = 0; i < GRID_SIZE; i++) {
    const raw = filledSlots[i];
    if (typeof raw === "string") {
      const v = raw.trim();
      normalized[i] = v.length > 0 ? v : null;
    } else {
      normalized[i] = null;
    }
  }
  return normalized;
}

export function computeLockedSlots(slots: (string | null)[]): boolean[] {
  const locked: boolean[] = new Array(GRID_SIZE).fill(false);
  for (let i = 0; i < GRID_SIZE; i++) {
    locked[i] = typeof slots[i] === "string" && Boolean(slots[i]);
  }
  return locked;
}

export function hasAnyFreeGridSlot(lockedSlots: boolean[]): boolean {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!lockedSlots[i]) return true;
  }
  return false;
}

export function firstFreeGridIndex(lockedSlots: boolean[]): number | null {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (!lockedSlots[i]) return i;
  }
  return null;
}

export function nearestFreeGridIndex(
  preferredIndex: number,
  lockedSlots: boolean[],
): number | null {
  let best: number | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (let i = 0; i < GRID_SIZE; i++) {
    if (lockedSlots[i]) continue;
    const d = manhattan(preferredIndex, i);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }

  return best;
}

export function ensureValidGridIndex(
  selectedGridIndex: number,
  lockedSlots: boolean[],
): number {
  const clamped = clampIndex(selectedGridIndex, GRID_SIZE);
  if (!lockedSlots[clamped]) return clamped;

  const nearest = nearestFreeGridIndex(clamped, lockedSlots);
  if (nearest !== null) return nearest;

  return 0;
}

export function initChunkNavState(ctx: ChunkNavContext): ChunkNavState {
  const hasFree = hasAnyFreeGridSlot(ctx.lockedSlots);
  const firstFree = firstFreeGridIndex(ctx.lockedSlots) ?? 0;

  // If there's no selectable cell, start on the confirm button.
  if (!hasFree) {
    return {
      cursorMode: "confirm",
      selectedInventoryIndex: 0,
      selectedGridIndex: 0,
    };
  }

  return {
    cursorMode: "inventory",
    selectedInventoryIndex: clampIndex(0, ctx.inventoryCount),
    selectedGridIndex: firstFree,
  };
}

function findSelectableInRow(
  targetRow: number,
  preferredCol: number,
  lockedSlots: boolean[],
): number | null {
  const base = targetRow * GRID_COLS;
  const primary = base + preferredCol;
  const alt = base + (preferredCol === 0 ? 1 : 0);

  if (primary >= 0 && primary < GRID_SIZE && !lockedSlots[primary])
    return primary;
  if (alt >= 0 && alt < GRID_SIZE && !lockedSlots[alt]) return alt;
  return null;
}

export function reduceChunkNavOnArrow(
  state: ChunkNavState,
  ctx: ChunkNavContext,
  dir: ChunkArrowDir,
): ChunkNavState {
  const invCount = ctx.inventoryCount;
  const locked = ctx.lockedSlots;

  if (state.cursorMode === "inventory") {
    if (dir === "right") {
      if (!hasAnyFreeGridSlot(locked)) {
        return { ...state, cursorMode: "confirm" };
      }
      return {
        ...state,
        cursorMode: "grid",
        selectedGridIndex: ensureValidGridIndex(
          state.selectedGridIndex,
          locked,
        ),
        selectedInventoryIndex: clampIndex(
          state.selectedInventoryIndex,
          invCount,
        ),
      };
    }

    if (invCount <= 0) {
      // No items to navigate; keep focus stable.
      return { ...state, selectedInventoryIndex: 0 };
    }

    if (dir === "down") {
      return {
        ...state,
        selectedInventoryIndex: (state.selectedInventoryIndex + 1) % invCount,
      };
    }

    if (dir === "up") {
      return {
        ...state,
        selectedInventoryIndex:
          (state.selectedInventoryIndex - 1 + invCount) % invCount,
      };
    }

    return state;
  }

  if (state.cursorMode === "grid") {
    const current = ensureValidGridIndex(state.selectedGridIndex, locked);
    const currentRow = rowOf(current);
    const currentCol = colOf(current);

    if (dir === "left") {
      if (currentCol === 0) {
        return {
          ...state,
          cursorMode: "inventory",
          selectedGridIndex: current,
        };
      }

      const next = current - 1;
      if (!locked[next]) return { ...state, selectedGridIndex: next };

      // If we can't move left within the grid (because the neighbor is locked),
      // treating LEFT as "go back to inventory" is more intuitive than jumping rows.
      return {
        ...state,
        cursorMode: "inventory",
        selectedGridIndex: current,
      };
    }

    if (dir === "right") {
      if (currentCol === 1) return { ...state, selectedGridIndex: current };

      const next = current + 1;
      if (!locked[next]) return { ...state, selectedGridIndex: next };

      return { ...state, selectedGridIndex: current };
    }

    if (dir === "down") {
      if (currentRow === 1) {
        return { ...state, cursorMode: "confirm", selectedGridIndex: current };
      }

      const candidate = findSelectableInRow(1, currentCol, locked);
      if (candidate === null) {
        // No selectable cell below; go to confirm to avoid softlock.
        return { ...state, cursorMode: "confirm", selectedGridIndex: current };
      }

      return { ...state, selectedGridIndex: candidate };
    }

    if (dir === "up") {
      if (currentRow === 0) {
        return {
          ...state,
          cursorMode: "inventory",
          selectedGridIndex: current,
        };
      }

      const candidate = findSelectableInRow(0, currentCol, locked);
      if (candidate === null) {
        return {
          ...state,
          cursorMode: "inventory",
          selectedGridIndex: current,
        };
      }

      return { ...state, selectedGridIndex: candidate };
    }

    return { ...state, selectedGridIndex: current };
  }

  // confirm
  if (state.cursorMode === "confirm") {
    if (dir !== "up") return state;

    if (!hasAnyFreeGridSlot(locked)) {
      // Nothing to focus in the grid; stay on confirm.
      return state;
    }

    return {
      ...state,
      cursorMode: "grid",
      selectedGridIndex: ensureValidGridIndex(state.selectedGridIndex, locked),
    };
  }

  return state;
}
