import { CostumeMechanicHandler } from "./CostumeMechanicHandler";

describe("CostumeMechanicHandler", () => {
  describe("isCorrectPart", () => {
    it("returns true when the part id matches the correct costume", () => {
      expect(
        CostumeMechanicHandler.isCorrectPart("indian_head", "indian"),
      ).toBe(true);
    });

    it("returns false when the part id belongs to a different costume", () => {
      expect(
        CostumeMechanicHandler.isCorrectPart("malandro_head", "indian"),
      ).toBe(false);
    });

    it("returns false for the dummy part regardless of the correct costume", () => {
      expect(CostumeMechanicHandler.isCorrectPart("dummy_head", "indian")).toBe(
        false,
      );
    });
  });

  it("creates independent state for each costume placeholder", () => {
    const first = CostumeMechanicHandler.createInitialState();
    const second = CostumeMechanicHandler.createInitialState();

    first.equippedParts.head = "indian_head";
    first.lockedParts.head = true;

    expect(second).toEqual({
      equippedParts: { head: null, torso: null, feet: null },
      lockedParts: { head: false, torso: false, feet: false },
    });
  });

  describe("deriveCorrectCostume", () => {
    it.each([
      ["PH2", ["indian_head", "indian_torso", "indian_feet"], "indian"],
      ["PH3", ["malandro_head", "malandro_torso", "malandro_feet"], "malandro"],
      ["PH4", ["warrior_head", "warrior_torso", "warrior_feet"], "warrior"],
      ["PH5", ["soldier_head", "soldier_torso", "soldier_feet"], "soldier"],
    ])("derives the correct costume for %s", (_placeholder, ids, expected) => {
      expect(CostumeMechanicHandler.deriveCorrectCostume(ids as string[])).toBe(
        expected,
      );
    });
  });
});
