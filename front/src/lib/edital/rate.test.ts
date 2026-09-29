import { safeRate } from "./rate";

describe("safeRate", () => {
  it("returns 0 for safeRate(0, 0), not NaN", () => {
    expect(safeRate(0, 0)).toEqual({ value: 0, numerator: 0, denominator: 0 });
  });

  it("returns 0 when denominator is negative", () => {
    expect(safeRate(5, -1).value).toBe(0);
  });

  it("computes a normal rate", () => {
    expect(safeRate(1, 4)).toEqual({
      value: 0.25,
      numerator: 1,
      denominator: 4,
    });
  });

  it("clamps to 1 when numerator exceeds denominator", () => {
    expect(safeRate(10, 5).value).toBe(1);
  });

  it("never returns a negative value", () => {
    expect(safeRate(-5, 10).value).toBe(0);
  });
});
