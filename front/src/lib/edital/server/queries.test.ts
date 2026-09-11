/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";
import {
  __resetQueryCacheForTests,
  MAX_CACHE_ENTRIES,
  withCache,
} from "./queries";

beforeEach(() => {
  process.env.RESPONSIVEVOICE_API_KEY = "test-key";
  resetServerEnv();
  __resetQueryCacheForTests();
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

  it("evicts the oldest entry once the cache exceeds MAX_CACHE_ENTRIES", async () => {
    for (let i = 0; i < MAX_CACHE_ENTRIES + 1; i++) {
      await withCache(`key-${i}`, () => Promise.resolve(i), {
        ttlMs: 60_000,
      });
    }

    // key-0 was the first inserted and should have been evicted, so this
    // call must re-run fn instead of serving a cached value.
    const fn = jest.fn().mockResolvedValue("re-fetched");
    await withCache("key-0", fn, { ttlMs: 60_000 });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("never grows the cache beyond MAX_CACHE_ENTRIES", async () => {
    for (let i = 0; i < MAX_CACHE_ENTRIES + 50; i++) {
      await withCache(`key-${i}`, () => Promise.resolve(i), {
        ttlMs: 60_000,
      });
    }

    // Re-fetching the most recently inserted key must be a cache hit —
    // proves eviction only removed the oldest entries, not everything.
    const fn = jest.fn().mockResolvedValue("should not run");
    const result = await withCache(`key-${MAX_CACHE_ENTRIES + 49}`, fn, {
      ttlMs: 60_000,
    });

    expect(fn).not.toHaveBeenCalled();
    expect(result).toBe(MAX_CACHE_ENTRIES + 49);
  });
});
