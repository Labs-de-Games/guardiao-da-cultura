import { act, render, screen } from "@testing-library/react";
import type { ChunkSelectorData } from "@/ui/state/game-ui-store";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { ChunkSelectorPanel } from "./ChunkSelectorPanel";
import { buildInitialState, reducer } from "./chunk-selector-types";

function buildManyChunks(count: number): ChunkSelectorData["availableItems"] {
  return Array.from({ length: count }, (_, i) => ({
    id: `chunk_${i}`,
    name: `Pedaço ${i}`,
    levelId: "level_1",
  }));
}

function resetStore() {
  useGameUIStore.setState({
    chunkSelectorOpen: false,
    chunkSelectorData: null,
  });
}

beforeEach(() => {
  resetStore();
});

describe("ChunkSelectorPanel", () => {
  it("returns null when closed", () => {
    const { container } = render(<ChunkSelectorPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("renders every inventory chunk even when the list overflows the visible area", () => {
    const availableItems = buildManyChunks(10);

    act(() => {
      useGameUIStore.setState({
        chunkSelectorOpen: true,
        chunkSelectorData: {
          instanceId: "instance_1",
          availableItems,
          filledSlots: [null, null, null, null],
          expectedSlots: ["chunk_0", "chunk_1", "chunk_2", "chunk_3"],
        },
      });
    });

    const { container } = render(<ChunkSelectorPanel />);

    const images = container.querySelectorAll(
      'img[src^="/assets/artworks/photos/chunk_"]',
    );
    expect(images.length).toBe(10);
  });

  it("keeps the inventory list scrollable instead of clipping overflow", () => {
    const availableItems = buildManyChunks(10);

    act(() => {
      useGameUIStore.setState({
        chunkSelectorOpen: true,
        chunkSelectorData: {
          instanceId: "instance_1",
          availableItems,
          filledSlots: [null, null, null, null],
          expectedSlots: ["chunk_0", "chunk_1", "chunk_2", "chunk_3"],
        },
      });
    });

    render(<ChunkSelectorPanel />);

    const inventoryHeading = screen.getByText("Inventário");
    const inventoryContainer = inventoryHeading.parentElement;
    expect(inventoryContainer).not.toBeNull();
    expect(
      window.getComputedStyle(inventoryContainer as Element).overflowY,
    ).toBe("auto");
  });

  it("drag-drops a chunk positioned past the visible fold into a grid slot", () => {
    const availableItems = buildManyChunks(10);
    const initial = buildInitialState(availableItems, [null, null, null, null]);

    const next = reducer(initial, {
      type: "DRAG_DROP",
      payload: { fromInventoryIndex: 9, toSlotIndex: 2 },
    });

    expect(next.slots[2]).toBe("chunk_9");
    expect(next.usedInventoryIndices[2]).toBe(9);
  });
});
