/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";
import { __resetQueryCacheForTests, withCache } from "./queries";

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
});
