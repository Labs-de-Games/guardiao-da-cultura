/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";
import { runHogQLQuery } from "./hogql";
import {
  __getQueryCacheSizeForTests,
  __resetQueryCacheForTests,
  clampMonotonicFunnel,
  fetchCampaigns,
  fetchCriticalErrors,
  fetchFunnel,
  fetchQuizPassRate,
  fetchSessionDuration,
  fetchSummary,
  MAX_CACHE_ENTRIES,
  withCache,
} from "./metrics";
import { __createScopeForTests } from "./scope";

jest.mock("./hogql", () => ({
  runHogQLQuery: jest.fn(),
}));

// safeRate itself is now tested in ../rate.test.ts (client-safe module);
// metrics.ts re-exports it for existing server-side call sites.

beforeEach(() => {
  process.env.RESPONSIVEVOICE_API_KEY = "test-key";
  resetServerEnv();
  __resetQueryCacheForTests();
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

describe("orchestration functions (fetchSummary/fetchFunnel/fetchSessionDuration/fetchCriticalErrors/fetchCampaigns)", () => {
  const scope = __createScopeForTests("escola-teste");
  const range = {
    from: new Date("2026-01-01T00:00:00Z"),
    to: new Date("2026-01-31T23:59:59Z"),
  };
  const mockRunHogQLQuery = runHogQLQuery as jest.Mock;

  beforeEach(() => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    resetServerEnv();
    __resetQueryCacheForTests();
    mockRunHogQLQuery.mockReset();
  });

  it("fetchSummary maps columns/results into a record", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["landing_page_viewed", "play_clicked"],
      results: [[100, 80]],
    });

    const result = await fetchSummary(scope, range);

    expect(result).toEqual({ landing_page_viewed: 100, play_clicked: 80 });
  });

  it("fetchSummary is cached — a second call does not re-query", async () => {
    mockRunHogQLQuery.mockResolvedValue({ columns: ["a"], results: [[1]] });

    await fetchSummary(scope, range);
    await fetchSummary(scope, range);

    expect(mockRunHogQLQuery).toHaveBeenCalledTimes(1);
  });

  it("fetchFunnel converts per-depth counts into cumulative, monotonic step counts", async () => {
    // 3 events; depth counts: 5 players at depth 0 (reached nothing), 10
    // at depth 1, 20 at depth 2, 30 at depth 3 (reached all steps).
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["depth", "players"],
      results: [
        [0, 5],
        [1, 10],
        [2, 20],
        [3, 30],
      ],
    });

    const result = await fetchFunnel(scope, range);

    // step 1 (index 0): depth >= 1 => 10+20+30 = 60
    // step 2 (index 1): depth >= 2 => 20+30 = 50
    // step 3 (index 2): depth >= 3 => 30
    expect(result[0].value).toBe(60);
    expect(result[1].value).toBe(50);
    expect(result[2].value).toBe(30);
  });

  it("fetchFunnel clamps a non-monotonic result down (defensive floor)", async () => {
    // Malformed/adversarial data: step 2 count exceeds step 1's.
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["depth", "players"],
      results: [[1, 10]],
    });

    const result = await fetchFunnel(scope, range);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].value).toBeLessThanOrEqual(result[i - 1].value);
    }
  });

  it("fetchSessionDuration returns avg, median seconds, and sessionsStarted", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["avg_seconds", "median_seconds", "sessions_started"],
      results: [[320.5, 280, 150]],
    });

    const result = await fetchSessionDuration(scope, range);

    expect(result).toEqual({
      avgSeconds: 320.5,
      medianSeconds: 280,
      sessionsStarted: 150,
    });
  });

  it("fetchSessionDuration defaults to zero when there are no rows", async () => {
    mockRunHogQLQuery.mockResolvedValue({ columns: [], results: [] });

    const result = await fetchSessionDuration(scope, range);

    expect(result).toEqual({
      avgSeconds: 0,
      medianSeconds: 0,
      sessionsStarted: 0,
    });
  });

  it("fetchQuizPassRate returns a safeRate of passed/total attempts", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["passed", "total"],
      results: [[30, 40]],
    });

    const result = await fetchQuizPassRate(scope, range);

    expect(result).toEqual({ value: 0.75, numerator: 30, denominator: 40 });
  });

  it("fetchQuizPassRate returns 0, not NaN, when there are no attempts", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["passed", "total"],
      results: [[0, 0]],
    });

    const result = await fetchQuizPassRate(scope, range);

    expect(result.value).toBe(0);
  });

  it("fetchCriticalErrors sums the total and keeps the per-error_code breakdown", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["error_code", "critical_count"],
      results: [
        ["asset_load_failed", 5],
        ["quiz_data_failed", 2],
      ],
    });

    const result = await fetchCriticalErrors(scope, range);

    expect(result).toEqual({
      total: 7,
      byErrorCode: { asset_load_failed: 5, quiz_data_failed: 2 },
    });
  });

  it("fetchCriticalErrors labels a null error_code as unknown", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["error_code", "critical_count"],
      results: [[null, 3]],
    });

    const result = await fetchCriticalErrors(scope, range);

    expect(result.byErrorCode.unknown).toBe(3);
  });

  it("fetchCampaigns returns the unique player count", async () => {
    mockRunHogQLQuery.mockResolvedValue({
      columns: ["unique_players"],
      results: [[42]],
    });

    const result = await fetchCampaigns(scope, range);

    expect(result).toEqual({ uniquePlayers: 42 });
  });

  it("different slugs never share a cache entry", async () => {
    mockRunHogQLQuery
      .mockResolvedValueOnce({ columns: ["a"], results: [[1]] })
      .mockResolvedValueOnce({ columns: ["a"], results: [[2]] });

    const scopeA = __createScopeForTests("escola-a");
    const scopeB = __createScopeForTests("escola-b");

    const a = await fetchSummary(scopeA, range);
    const b = await fetchSummary(scopeB, range);

    expect(a).toEqual({ a: 1 });
    expect(b).toEqual({ a: 2 });
    expect(mockRunHogQLQuery).toHaveBeenCalledTimes(2);
  });
});
