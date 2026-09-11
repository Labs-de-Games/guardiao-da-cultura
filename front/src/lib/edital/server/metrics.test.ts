/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { clampMonotonicFunnel, safeRate } from "./metrics";

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

describe("clampMonotonicFunnel", () => {
  it("leaves an already-monotonic sequence unchanged", () => {
    expect(clampMonotonicFunnel([100, 80, 50, 20])).toEqual([100, 80, 50, 20]);
  });

  it("clamps a step that exceeds the previous one down to it", () => {
    expect(clampMonotonicFunnel([100, 120, 50])).toEqual([100, 100, 50]);
  });

  it("propagates a clamp forward through subsequent steps", () => {
    expect(clampMonotonicFunnel([50, 100, 80, 90])).toEqual([50, 50, 50, 50]);
  });

  it("handles an empty array", () => {
    expect(clampMonotonicFunnel([])).toEqual([]);
  });

  it("handles a single-element array", () => {
    expect(clampMonotonicFunnel([42])).toEqual([42]);
  });
});
