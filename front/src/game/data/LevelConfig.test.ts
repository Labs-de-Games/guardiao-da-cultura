import { getNextLevelId, getOrderedLevelIds } from "./LevelConfig";

describe("getOrderedLevelIds", () => {
  it("orders levels by levelNumber", () => {
    expect(getOrderedLevelIds()).toEqual(["level_01", "level_02"]);
  });
});

describe("getNextLevelId", () => {
  it("returns the following level", () => {
    expect(getNextLevelId("level_01")).toBe("level_02");
  });

  it("returns undefined for the last level", () => {
    const ids = getOrderedLevelIds();
    expect(getNextLevelId(ids[ids.length - 1])).toBeUndefined();
  });

  it("returns undefined for an unknown level", () => {
    expect(getNextLevelId("level_99")).toBeUndefined();
  });
});
