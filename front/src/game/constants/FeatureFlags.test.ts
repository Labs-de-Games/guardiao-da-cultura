import { isLevelEnabled, LEVEL_ENABLED } from "./FeatureFlags";

describe("isLevelEnabled", () => {
  it("enables the levels that ship playable", () => {
    expect(isLevelEnabled("level_01")).toBe(true);
    expect(isLevelEnabled("level_02")).toBe(true);
    expect(isLevelEnabled("level_03")).toBe(true);
    expect(isLevelEnabled("level_04")).toBe(true);
  });

  it("agrees with the table for every level listed", () => {
    for (const [levelId, enabled] of Object.entries(LEVEL_ENABLED)) {
      expect(isLevelEnabled(levelId)).toBe(enabled);
    }
  });

  it("denies levels that are not listed", () => {
    expect(LEVEL_ENABLED.level_99).toBeUndefined();
    expect(isLevelEnabled("level_99")).toBe(false);
  });
});
