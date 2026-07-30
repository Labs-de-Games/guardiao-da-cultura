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

  describe("deriveCorrectCostume", () => {
    it("derives the costume name from the placeholder's id list", () => {
      expect(
        CostumeMechanicHandler.deriveCorrectCostume([
          "indian_head",
          "indian_torso",
          "indian_feet",
        ]),
      ).toBe("indian");
    });
  });
});
