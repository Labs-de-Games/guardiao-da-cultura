import type { CursorContext } from "./investigation-keyboard";
import {
  firstCursor,
  isCursorValid,
  moveCursor,
} from "./investigation-keyboard";

/** Five suspects and two clues: the shape the real board is laid out in. */
const BROWSE: CursorContext = {
  clueCount: 2,
  suspectCount: 5,
  mode: "browse",
  railIndex: 0,
};

function placing(
  canTargetSlot: (suspectIndex: number, slotIndex: number) => boolean,
): CursorContext {
  return { ...BROWSE, mode: "placing", canTargetSlot };
}

describe("investigation keyboard cursor", () => {
  describe("the evidence rail", () => {
    it("walks the clue list vertically", () => {
      expect(
        moveCursor({ zone: "rail", clueIndex: 0 }, "down", BROWSE),
      ).toEqual({ zone: "rail", clueIndex: 1 });
      expect(moveCursor({ zone: "rail", clueIndex: 1 }, "up", BROWSE)).toEqual({
        zone: "rail",
        clueIndex: 0,
      });
    });

    it("stops at both ends rather than wrapping", () => {
      expect(moveCursor({ zone: "rail", clueIndex: 0 }, "up", BROWSE)).toEqual({
        zone: "rail",
        clueIndex: 0,
      });
      expect(
        moveCursor({ zone: "rail", clueIndex: 1 }, "down", BROWSE),
      ).toEqual({ zone: "rail", clueIndex: 1 });
    });

    it("steps onto the board at the slots, not the portraits", () => {
      expect(
        moveCursor({ zone: "rail", clueIndex: 0 }, "right", BROWSE),
      ).toEqual({ zone: "slot", suspectIndex: 0, slotIndex: 0 });
    });

    it("is where the board's left edge leads back to", () => {
      expect(
        moveCursor({ zone: "slot", suspectIndex: 0, slotIndex: 0 }, "left", {
          ...BROWSE,
          railIndex: 1,
        }),
      ).toEqual({ zone: "rail", clueIndex: 1 });
    });
  });

  describe("the corkboard", () => {
    it("runs along a seat's slots and on into the next seat", () => {
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 0, slotIndex: 2 },
          "right",
          BROWSE,
        ),
      ).toEqual({ zone: "slot", suspectIndex: 1, slotIndex: 0 });
    });

    it("reaches the dossier above a seat and the accusation below it", () => {
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 1, slotIndex: 1 },
          "up",
          BROWSE,
        ),
      ).toEqual({ zone: "portrait", suspectIndex: 1 });
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 1, slotIndex: 1 },
          "down",
          BROWSE,
        ),
      ).toEqual({ zone: "accuse", suspectIndex: 1 });
    });

    /**
     * Three seats above and two below, so "the seat under this one" is only
     * answerable in terms of where they are actually pinned.
     */
    it("drops to the nearest seat of the row below", () => {
      expect(
        moveCursor({ zone: "accuse", suspectIndex: 2 }, "down", BROWSE),
      ).toEqual({ zone: "portrait", suspectIndex: 4 });
      expect(
        moveCursor({ zone: "accuse", suspectIndex: 0 }, "down", BROWSE),
      ).toEqual({ zone: "portrait", suspectIndex: 3 });
    });

    it("stays put at the top and bottom of the board", () => {
      const top = { zone: "portrait", suspectIndex: 0 } as const;
      expect(moveCursor(top, "up", BROWSE)).toEqual(top);
      const bottom = { zone: "accuse", suspectIndex: 4 } as const;
      expect(moveCursor(bottom, "down", BROWSE)).toEqual(bottom);
    });
  });

  describe("with a clue in hand", () => {
    const anywhere = placing(() => true);

    it("reaches only the slots", () => {
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 0, slotIndex: 0 },
          "up",
          anywhere,
        ),
      ).toEqual({ zone: "slot", suspectIndex: 0, slotIndex: 0 });
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 0, slotIndex: 0 },
          "down",
          anywhere,
        ),
      ).toEqual({ zone: "slot", suspectIndex: 3, slotIndex: 0 });
    });

    it("never leaves the board for the rail", () => {
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 0, slotIndex: 0 },
          "left",
          anywhere,
        ),
      ).toEqual({ zone: "slot", suspectIndex: 0, slotIndex: 0 });
    });

    /** A clue never displaces another, so a full slot is not a place to aim at. */
    it("skips slots that are already taken", () => {
      const occupied = placing(
        (suspectIndex, slotIndex) => !(suspectIndex === 0 && slotIndex === 1),
      );
      expect(
        moveCursor(
          { zone: "slot", suspectIndex: 0, slotIndex: 0 },
          "right",
          occupied,
        ),
      ).toEqual({ zone: "slot", suspectIndex: 0, slotIndex: 2 });
    });

    it("starts on the first slot that will take it", () => {
      const lateSeat = placing((suspectIndex) => suspectIndex === 4);
      expect(firstCursor(lateSeat)).toEqual({
        zone: "slot",
        suspectIndex: 4,
        slotIndex: 0,
      });
    });
  });

  describe("validity", () => {
    it("summons the cursor onto the rail first", () => {
      expect(firstCursor(BROWSE)).toEqual({ zone: "rail", clueIndex: 0 });
    });

    it("rejects a rail position past the end of the evidence", () => {
      expect(isCursorValid({ zone: "rail", clueIndex: 5 }, BROWSE)).toBe(false);
      expect(isCursorValid({ zone: "rail", clueIndex: 1 }, BROWSE)).toBe(true);
    });

    it("rejects a slot the held clue can no longer land in", () => {
      const cursor = { zone: "slot", suspectIndex: 0, slotIndex: 0 } as const;
      expect(
        isCursorValid(
          cursor,
          placing(() => true),
        ),
      ).toBe(true);
      expect(
        isCursorValid(
          cursor,
          placing(() => false),
        ),
      ).toBe(false);
    });

    it("rejects the rail entirely while a clue is in hand", () => {
      expect(
        isCursorValid(
          { zone: "rail", clueIndex: 0 },
          placing(() => true),
        ),
      ).toBe(false);
    });
  });
});
