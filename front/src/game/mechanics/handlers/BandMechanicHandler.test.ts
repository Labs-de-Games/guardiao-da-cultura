import { BandMechanicHandler } from "./BandMechanicHandler";

describe("BandMechanicHandler", () => {
  describe("getMusicianAsset", () => {
    it.each([
      "accordion",
      "jam_block",
      "triangle",
      "zabumba",
    ])("returns the correct-folder asset for %s", (musicianId) => {
      expect(BandMechanicHandler.getMusicianAsset(musicianId)).toBe(
        `/assets/band/correct/${musicianId}.png`,
      );
    });

    it("returns the incorrect-folder asset for an unknown musician id", () => {
      expect(BandMechanicHandler.getMusicianAsset("guitar")).toBe(
        "/assets/band/incorrect/guitar.png",
      );
    });
  });

  describe("shuffle", () => {
    it("returns a new array instance, not the same reference", () => {
      const items = ["a", "b", "c"];
      expect(BandMechanicHandler.shuffle(items)).not.toBe(items);
    });

    it("does not mutate the input array", () => {
      const items = ["a", "b", "c", "d"];
      const copy = [...items];
      BandMechanicHandler.shuffle(items);
      expect(items).toEqual(copy);
    });

    it("preserves length and the same multiset of elements", () => {
      const items = ["accordion", "jam_block", "triangle", "zabumba"];
      const shuffled = BandMechanicHandler.shuffle(items);
      expect(shuffled).toHaveLength(items.length);
      expect([...shuffled].sort()).toEqual([...items].sort());
    });

    it("returns an empty array when given an empty array", () => {
      expect(BandMechanicHandler.shuffle([])).toEqual([]);
    });
  });
});
