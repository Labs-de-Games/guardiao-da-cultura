/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";
import {
  __getQueryCacheSizeForTests,
  __resetQueryCacheForTests,
  clampMonotonicFunnel,
  safeRate,
  withCache,
} from "./metrics";

beforeEach(() => {
  process.env.RESPONSIVEVOICE_API_KEY = "test-key";
  resetServerEnv();
  __resetQueryCacheForTests();
});

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

describe("withCache", () => {
  it("calls fn once for two concurrent identical calls (single-flight)", async () => {
    const fn = jest
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(42), 10)),
      );

    const [a, b] = await Promise.all([withCache("k", fn), withCache("k", fn)]);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(a).toBe(42);
    expect(b).toBe(42);
  });

  it("serves a cached value without calling fn again within the TTL", async () => {
    const fn = jest.fn().mockResolvedValue("value");

    await withCache("k", fn, { ttlMs: 10_000 });
    const second = await withCache("k", fn, { ttlMs: 10_000 });

    expect(fn).toHaveBeenCalledTimes(1);
    expect(second).toBe("value");
  });

  it("calls fn again after the TTL expires", async () => {
    const fn = jest.fn().mockResolvedValue("value");

    await withCache("k", fn, { ttlMs: 1 });
    await new Promise((r) => setTimeout(r, 10));
    await withCache("k", fn, { ttlMs: 1 });

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not cache a rejected call", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("recovered");

    await expect(withCache("k", fn)).rejects.toThrow("boom");
    const result = await withCache("k", fn);

    expect(result).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("keys are independent — different keys never collide", async () => {
    const fnA = jest.fn().mockResolvedValue("a");
    const fnB = jest.fn().mockResolvedValue("b");

    const a = await withCache("key-a", fnA);
    const b = await withCache("key-b", fnB);

    expect(a).toBe("a");
    expect(b).toBe("b");
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledTimes(1);
  });

  it("caps the cache size instead of growing unbounded (#742)", async () => {
    for (let i = 0; i < 250; i++) {
      const fn = jest.fn().mockResolvedValue(i);
      await withCache(`key-${i}`, fn);
    }

    expect(__getQueryCacheSizeForTests()).toBeLessThanOrEqual(200);
  });
});
