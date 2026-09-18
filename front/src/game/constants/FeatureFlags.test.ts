import { isLevelEnabled, LEVEL_ENABLED } from "./FeatureFlags";

describe("isLevelEnabled", () => {
  it("enables the levels that ship playable", () => {
    expect(isLevelEnabled("level_01")).toBe(true);
    expect(isLevelEnabled("level_02")).toBe(true);
  });

  it("keeps the unfinished phases gated", () => {
    // Level 3's curator dialogue and quizzes are still placeholder copy, and
    // the identification phase sits behind the same kind of gate. Both are
    // flipped on locally to play them; flipping either here is a release
    // decision, and this is the test that makes it a deliberate one.
    expect(isLevelEnabled("level_03")).toBe(false);
    expect(isLevelEnabled("level_04")).toBe(false);
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
