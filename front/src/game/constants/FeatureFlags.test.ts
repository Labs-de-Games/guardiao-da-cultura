import { isLevelEnabled, LEVEL_ENABLED } from "./FeatureFlags";

describe("isLevelEnabled", () => {
  it("enables the levels listed as true", () => {
    expect(isLevelEnabled("level_01")).toBe(true);
    expect(isLevelEnabled("level_02")).toBe(true);
  });

  it("denies levels that are not listed", () => {
    expect(LEVEL_ENABLED.level_99).toBeUndefined();
    expect(isLevelEnabled("level_99")).toBe(false);
  });
});
