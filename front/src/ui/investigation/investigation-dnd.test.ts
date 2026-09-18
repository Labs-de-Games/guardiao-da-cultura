import type { Modifier } from "@dnd-kit/core";
import {
  clueKeyFromDragId,
  DRAG_IMAGE_SIZE,
  parseSlotDropId,
  slotDropId,
  snapClueToCursor,
} from "./investigation-dnd";

type ModifierArgs = Parameters<Modifier>[0];

/** A rail row: wide, so grabbing it off-centre is the interesting case. */
const ROW = { left: 100, top: 50, width: 280, height: 90 };

function args(overrides: Partial<ModifierArgs>): ModifierArgs {
  return {
    activatorEvent: null,
    active: null,
    activeNodeRect: null,
    containerNodeRect: null,
    draggingNodeRect: null,
    over: null,
    overlayNodeRect: null,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
    windowRect: null,
    ...overrides,
  } as ModifierArgs;
}

/** Where the dragged square ends up on screen, given a modifier's transform. */
function centre(transform: { x: number; y: number }) {
  return {
    x: ROW.left + transform.x + DRAG_IMAGE_SIZE / 2,
    y: ROW.top + transform.y + DRAG_IMAGE_SIZE / 2,
  };
}

describe("investigation drag ids", () => {
  it("round-trips a slot id", () => {
    expect(parseSlotDropId(slotDropId("helena_marques", 2))).toEqual({
      suspectId: "helena_marques",
      slotIndex: 2,
    });
  });

  it("reads a clue key back off a drag id", () => {
    expect(clueKeyFromDragId("clue:level_01:varnish")).toBe("level_01:varnish");
    expect(clueKeyFromDragId("slot:helena_marques:0")).toBeNull();
  });
});

describe("snapClueToCursor", () => {
  it("centres the art on the cursor however the row was grabbed", () => {
    // Grabbed 220px into the row — out past the title, nowhere near the art.
    const activatorEvent = { clientX: 320, clientY: 70 } as MouseEvent;

    const transform = snapClueToCursor(
      args({
        activatorEvent,
        draggingNodeRect: ROW as ModifierArgs["draggingNodeRect"],
        transform: { x: 40, y: 10, scaleX: 1, scaleY: 1 },
      }),
    );

    // The pointer has moved by the same delta as the transform.
    expect(centre(transform)).toEqual({ x: 320 + 40, y: 70 + 10 });
  });

  it("lands on the cursor for a grab on the thumbnail too", () => {
    const activatorEvent = { clientX: 120, clientY: 90 } as MouseEvent;

    const transform = snapClueToCursor(
      args({
        activatorEvent,
        draggingNodeRect: ROW as ModifierArgs["draggingNodeRect"],
        transform: { x: -15, y: 200, scaleX: 1, scaleY: 1 },
      }),
    );

    expect(centre(transform)).toEqual({ x: 120 - 15, y: 90 + 200 });
  });

  it("reads a touch start the same way", () => {
    const activatorEvent = {
      touches: [{ clientX: 300, clientY: 60 }],
    } as unknown as TouchEvent;

    const transform = snapClueToCursor(
      args({
        activatorEvent,
        draggingNodeRect: ROW as ModifierArgs["draggingNodeRect"],
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      }),
    );

    expect(centre(transform)).toEqual({ x: 300, y: 60 });
  });

  it("leaves the transform alone when there is nothing to measure", () => {
    const transform = { x: 7, y: 9, scaleX: 1, scaleY: 1 };

    expect(snapClueToCursor(args({ transform }))).toEqual(transform);
  });
});
