import { INVESTIGATION_SLOTS } from "@/game/constants/Investigation";
import { SEATS } from "./investigation-layout";

/**
 * Where the keyboard cursor is sitting.
 *
 * The screen is not a grid — a rail of clues on the left, then five seats laid
 * out three above and two below, each with its own slots and accuse button — so
 * the cursor names what it is on rather than an x/y.
 */
export type InvestigationCursor =
  | { zone: "rail"; clueIndex: number }
  | { zone: "portrait"; suspectIndex: number }
  | { zone: "slot"; suspectIndex: number; slotIndex: number }
  | { zone: "accuse"; suspectIndex: number }
  | { zone: "footer"; index: number };

/** The bar under the board, in the order it is drawn. */
export const FOOTER_BUTTONS = ["tutorial", "exit"] as const;
export type FooterButton = (typeof FOOTER_BUTTONS)[number];

export type CursorDirection = "up" | "down" | "left" | "right";

/**
 * What the cursor can reach right now.
 *
 * `browse` is the empty-handed mode: everything is reachable, because reading a
 * dossier, taking a clue back off a seat and accusing are all things done with
 * nothing in hand. `placing` is the mode a picked-up clue puts the player in,
 * and there the only thing worth reaching is a slot that will actually take it —
 * an occupied slot is not a target, since a clue never displaces another one.
 */
export interface CursorContext {
  clueCount: number;
  suspectCount: number;
  mode: "browse" | "placing";
  /** Placing mode: whether the held clue can land in this slot. */
  canTargetSlot?: (suspectIndex: number, slotIndex: number) => boolean;
  /** Which clue Left off the board's first column goes back to. */
  railIndex?: number;
  /**
   * Whether the bar under the board — COMO JOGAR and VOLTAR — is in play. It
   * is not while a clue is in hand: neither button is somewhere a clue goes.
   */
  footer?: boolean;
  /**
   * The walkthrough narrows the board to one seat — the one its highlight is
   * on — so the cursor cannot wander off the lesson. The rail stays reachable,
   * since picking a clue up is half of the move being rehearsed.
   */
  restrictToSuspectIndex?: number | null;
}

/**
 * Horizontal spread of a seat's slots, in the same percentage units as `SEATS`.
 *
 * Only their order matters — this is what makes moving up from the middle slot
 * land on the seat above it rather than on its neighbour.
 */
const SLOT_SPREAD = 6;

interface Cell {
  cursor: InvestigationCursor;
  /** Position across the corkboard, used to hold a column while moving rows. */
  x: number;
}

/** Where the footer buttons sit across the screen, in the same units as `SEATS`. */
const FOOTER_X = [80, 95];

function seatX(suspectIndex: number): number {
  return SEATS[suspectIndex]?.left ?? 50;
}

/** The seats, grouped into the two rows the corkboard actually draws. */
function seatRows(suspectCount: number): number[][] {
  const top: number[] = [];
  const bottom: number[] = [];
  for (let i = 0; i < Math.min(suspectCount, SEATS.length); i++) {
    (SEATS[i].edge === "top" ? top : bottom).push(i);
  }
  return [top, bottom].filter((row) => row.length > 0);
}

function slotCells(seats: number[], ctx: CursorContext): Cell[] {
  const cells: Cell[] = [];
  for (const suspectIndex of seats) {
    for (let slotIndex = 0; slotIndex < INVESTIGATION_SLOTS; slotIndex++) {
      if (
        ctx.mode === "placing" &&
        !ctx.canTargetSlot?.(suspectIndex, slotIndex)
      ) {
        continue;
      }
      cells.push({
        cursor: { zone: "slot", suspectIndex, slotIndex },
        // Kept at the slot's real position even when its neighbours are skipped,
        // so a filtered row still lines up with the one above it.
        x:
          seatX(suspectIndex) +
          (slotIndex - (INVESTIGATION_SLOTS - 1) / 2) * SLOT_SPREAD,
      });
    }
  }
  return cells;
}

/**
 * The board as rows, top to bottom: each seat row contributes its portraits,
 * its slots and its accuse buttons, which is the order they are drawn in.
 */
export function buildRows(ctx: CursorContext): Cell[][] {
  const rows: Cell[][] = [];

  // Narrowed to a single seat's slots: no portraits, no accusations, no other
  // suspects — one row, and it is the row the walkthrough is pointing at.
  const only = ctx.restrictToSuspectIndex;
  if (only !== undefined && only !== null) {
    const cells = slotCells([only], ctx);
    return cells.length > 0 ? [cells] : [];
  }

  for (const seats of seatRows(ctx.suspectCount)) {
    if (ctx.mode === "browse") {
      rows.push(
        seats.map((suspectIndex) => ({
          cursor: { zone: "portrait" as const, suspectIndex },
          x: seatX(suspectIndex),
        })),
      );
    }

    const slots = slotCells(seats, ctx);
    if (slots.length > 0) rows.push(slots);

    if (ctx.mode === "browse") {
      rows.push(
        seats.map((suspectIndex) => ({
          cursor: { zone: "accuse" as const, suspectIndex },
          x: seatX(suspectIndex),
        })),
      );
    }
  }

  if (ctx.footer && ctx.mode === "browse") {
    rows.push(
      FOOTER_BUTTONS.map((_button, index) => ({
        cursor: { zone: "footer" as const, index },
        x: FOOTER_X[index] ?? 95,
      })),
    );
  }

  return rows;
}

function sameCursor(a: InvestigationCursor, b: InvestigationCursor): boolean {
  if (a.zone !== b.zone) return false;
  if (a.zone === "rail") return a.clueIndex === (b as typeof a).clueIndex;
  if (a.zone === "footer") return a.index === (b as typeof a).index;
  if (a.zone === "slot") {
    const other = b as typeof a;
    return (
      a.suspectIndex === other.suspectIndex && a.slotIndex === other.slotIndex
    );
  }
  return a.suspectIndex === (b as { suspectIndex: number }).suspectIndex;
}

function locate(
  rows: Cell[][],
  cursor: InvestigationCursor,
): { row: number; col: number } | null {
  for (let row = 0; row < rows.length; row++) {
    const col = rows[row].findIndex((cell) => sameCursor(cell.cursor, cursor));
    if (col !== -1) return { row, col };
  }
  return null;
}

function nearestByX(row: Cell[], x: number): InvestigationCursor {
  let best = row[0];
  for (const cell of row) {
    if (Math.abs(cell.x - x) < Math.abs(best.x - x)) best = cell;
  }
  return best.cursor;
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, 0), Math.max(max, 0));
}

/** Where the cursor appears when it is first summoned, or has nowhere valid left. */
export function firstCursor(ctx: CursorContext): InvestigationCursor | null {
  if (ctx.mode === "browse" && ctx.clueCount > 0) {
    return { zone: "rail", clueIndex: 0 };
  }
  const rows = buildRows(ctx);
  return rows[0]?.[0]?.cursor ?? null;
}

/**
 * Whether the cursor still points at something that exists.
 *
 * Placing a clue, taking one back or clearing a suspect all change what is
 * reachable underneath a cursor that has not moved.
 */
export function isCursorValid(
  cursor: InvestigationCursor,
  ctx: CursorContext,
): boolean {
  if (cursor.zone === "rail") {
    return ctx.mode === "browse" && cursor.clueIndex < ctx.clueCount;
  }
  return locate(buildRows(ctx), cursor) !== null;
}

/**
 * One step of the cursor.
 *
 * The rail is a column of its own: Up and Down walk it, Right steps onto the
 * board, and Left off the board's first column comes back to it. Rows hold their
 * column across a vertical move, so going down the middle of the board stays in
 * the middle even though the bottom row has one seat fewer.
 */
export function moveCursor(
  cursor: InvestigationCursor,
  direction: CursorDirection,
  ctx: CursorContext,
): InvestigationCursor {
  const rows = buildRows(ctx);
  if (rows.length === 0 && cursor.zone !== "rail") {
    return firstCursor(ctx) ?? cursor;
  }

  if (cursor.zone === "rail") {
    if (direction === "up") {
      return { zone: "rail", clueIndex: Math.max(0, cursor.clueIndex - 1) };
    }
    if (direction === "down") {
      if (cursor.clueIndex < ctx.clueCount - 1) {
        return { zone: "rail", clueIndex: cursor.clueIndex + 1 };
      }
      // Off the bottom of the list is the bar drawn under it.
      const footerRow = rows.find((row) => row[0]?.cursor.zone === "footer");
      return footerRow?.[0]?.cursor ?? cursor;
    }
    if (direction === "left") return cursor;

    // Right steps onto the board at the slots rather than the portraits: the
    // rail's whole purpose is to send a clue to a seat.
    const slotRow = rows.find((row) => row[0]?.cursor.zone === "slot");
    return (slotRow ?? rows[0])?.[0]?.cursor ?? cursor;
  }

  // The bar's first button is where the rail's last clue leads, so going back
  // up from it returns there rather than to the board.
  if (
    cursor.zone === "footer" &&
    cursor.index === 0 &&
    direction === "up" &&
    ctx.clueCount > 0
  ) {
    return { zone: "rail", clueIndex: ctx.clueCount - 1 };
  }

  const at = locate(rows, cursor);
  if (!at) return firstCursor(ctx) ?? cursor;
  const current = rows[at.row][at.col];

  if (direction === "left") {
    if (at.col > 0) return rows[at.row][at.col - 1].cursor;
    // Off the board's left edge and back into the evidence — but only when
    // empty-handed, since a held clue has no business in the rail.
    if (ctx.mode === "browse" && ctx.clueCount > 0) {
      return {
        zone: "rail",
        clueIndex: clamp(ctx.railIndex ?? 0, ctx.clueCount - 1),
      };
    }
    return cursor;
  }

  if (direction === "right") {
    return rows[at.row][Math.min(at.col + 1, rows[at.row].length - 1)].cursor;
  }

  const nextRow = at.row + (direction === "up" ? -1 : 1);
  if (nextRow < 0 || nextRow >= rows.length) return cursor;
  return nearestByX(rows[nextRow], current.x);
}
