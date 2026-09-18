import {
  type CollisionDetection,
  type Modifier,
  pointerWithin,
  rectIntersection,
} from "@dnd-kit/core";
import type { InvestigationClue } from "@/game/types/InvestigationTypes";

/**
 * Draggable ids are `clue:<clueKey>`; droppable ids are
 * `slot:<suspectId>:<index>`. Every suspect keeps their own slots on the table
 * now, so a drop id has to say whose seat it belongs to.
 */
export const CLUE_DRAG_PREFIX = "clue:";
export const SLOT_DROP_PREFIX = "slot:";

export function clueKeyFromDragId(id: string): string | null {
  return id.startsWith(CLUE_DRAG_PREFIX)
    ? id.slice(CLUE_DRAG_PREFIX.length)
    : null;
}

export function slotDropId(suspectId: string, slotIndex: number): string {
  return `${SLOT_DROP_PREFIX}${suspectId}:${slotIndex}`;
}

export function parseSlotDropId(
  id: string,
): { suspectId: string; slotIndex: number } | null {
  if (!id.startsWith(SLOT_DROP_PREFIX)) return null;
  const separator = id.lastIndexOf(":");
  if (separator <= SLOT_DROP_PREFIX.length - 1) return null;

  const slotIndex = Number.parseInt(id.slice(separator + 1), 10);
  if (Number.isNaN(slotIndex)) return null;

  return {
    suspectId: id.slice(SLOT_DROP_PREFIX.length, separator),
    slotIndex,
  };
}

/** Clue art follows the repo-wide `/assets/collectibles/<id>.png` convention. */
export function clueImageSrc(clue: Pick<InvestigationClue, "clueId">): string {
  return `/assets/collectibles/${clue.clueId}.png`;
}

/** Side of the square that follows the cursor while a clue is in the air. */
export const DRAG_IMAGE_SIZE = 68;

/** Where a pointer, mouse or touch event happened, in viewport coordinates. */
function eventPoint(event: Event): { x: number; y: number } | null {
  if ("clientX" in event && "clientY" in event) {
    const { clientX, clientY } = event as MouseEvent;
    return { x: clientX, y: clientY };
  }

  const touch =
    (event as TouchEvent).touches?.[0] ??
    (event as TouchEvent).changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

/**
 * Keeps the dragged clue centred on the cursor.
 *
 * By default the overlay holds the offset it was grabbed at, which on a rail
 * row two hundred pixels wide means the art flies along well away from the
 * pointer when the player grabs the title rather than the thumbnail. Here the
 * drag start tells us how far into the row the grab was, and that distance is
 * subtracted back out so the square lands under the cursor however it was
 * picked up.
 */
export const snapClueToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!draggingNodeRect || !activatorEvent) return transform;

  const point = eventPoint(activatorEvent);
  if (!point) return transform;

  return {
    ...transform,
    x: transform.x + point.x - draggingNodeRect.left - DRAG_IMAGE_SIZE / 2,
    y: transform.y + point.y - draggingNodeRect.top - DRAG_IMAGE_SIZE / 2,
  };
};

/**
 * Resolves the drop from the cursor, not from the box being dragged.
 *
 * dnd-kit's default strategies intersect the *dragged node* with the slots, and
 * that node is the whole rail row — so grabbing a clue by its title aimed the
 * drop a row's width away from where the player was pointing, even though the
 * art itself was drawn under the cursor. Testing the pointer instead makes the
 * two agree: the slot that lights up is the slot the mouse is over.
 */
export const dropAtPointer: CollisionDetection = (args) =>
  // Keyboard dragging reports no pointer, so it keeps the rect behaviour.
  args.pointerCoordinates ? pointerWithin(args) : rectIntersection(args);
