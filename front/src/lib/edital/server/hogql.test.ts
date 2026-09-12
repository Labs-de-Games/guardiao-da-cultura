/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { resetServerEnv } from "../../env-server";
import {
  DEFAULT_HOGQL_TIMEOUT_MS,
  HogQLNotConfiguredError,
  HogQLRateLimitError,
  HogQLRequestError,
  runHogQLQuery,
} from "./hogql";

const ORIGINAL_ENV = process.env;
const TEST_KEY = "phx_super_secret_value_never_leak_me";

function setConfiguredEnv() {
  process.env.RESPONSIVEVOICE_API_KEY = "test-key";
  process.env.POSTHOG_PERSONAL_API_KEY = TEST_KEY;
  process.env.POSTHOG_PROJECT_ID = "12345";
  process.env.POSTHOG_QUERY_HOST = "https://us.posthog.com";
  resetServerEnv();
}

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe("runHogQLQuery", () => {
  it("throws HogQLNotConfiguredError when the key/project id are unset", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.POSTHOG_PERSONAL_API_KEY = undefined;
    process.env.POSTHOG_PROJECT_ID = undefined;
    resetServerEnv();

    await expect(runHogQLQuery("SELECT 1", {})).rejects.toThrow(
      HogQLNotConfiguredError,
    );
  });

  it("sends a bearer header and the expected body shape", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ columns: ["count"], results: [[5]] }),
      headers: new Headers(),
    });

    await runHogQLQuery("SELECT count() FROM events", {}, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://us.posthog.com/api/projects/12345/query/");
    expect(init.headers.Authorization).toBe(`Bearer ${TEST_KEY}`);
    const body = JSON.parse(init.body);
    expect(body).toEqual({
      query: {
        kind: "HogQLQuery",
        query: "SELECT count() FROM events",
        values: {},
      },
      refresh: "blocking",
    });
  });

  it("passes values through as bound parameters, never interpolated into the query string", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ columns: [], results: [] }),
      headers: new Headers(),
    });

    await runHogQLQuery(
      "SELECT count() FROM events WHERE properties.campaign_source = {slug}",
      { slug: "escola-teste", from_ts: "2026-01-01T00:00:00Z" },
      { fetchImpl },
    );

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.query.query).not.toContain("escola-teste");
    expect(body.query.values).toEqual({
      slug: "escola-teste",
      from_ts: "2026-01-01T00:00:00Z",
    });
  });

  it("returns columns and results on success", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ columns: ["count"], results: [[5]] }),
      headers: new Headers(),
    });

    const result = await runHogQLQuery("SELECT 1", {}, { fetchImpl });

    expect(result).toEqual({ columns: ["count"], results: [[5]] });
  });

  it("throws HogQLRateLimitError with retryAfterSeconds on 429", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({ "retry-after": "30" }),
      json: async () => ({}),
    });

    const promise = runHogQLQuery("SELECT 1", {}, { fetchImpl });
    await expect(promise).rejects.toThrow(HogQLRateLimitError);
    await promise.catch((err: HogQLRateLimitError) => {
      expect(err.retryAfterSeconds).toBe(30);
    });
  });

  it("throws HogQLRequestError on a non-2xx, non-429 response", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({}),
    });

    await expect(runHogQLQuery("SELECT 1", {}, { fetchImpl })).rejects.toThrow(
      HogQLRequestError,
    );
  });

  it("never includes the personal key in any thrown error message", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: async () => ({ error: `leaked ${TEST_KEY}` }),
    });

    try {
      await runHogQLQuery("SELECT 1", {}, { fetchImpl });
      throw new Error("expected runHogQLQuery to throw");
    } catch (err) {
      expect(String(err)).not.toContain(TEST_KEY);
    }
  });

  it("aborts the request after the timeout", async () => {
    setConfiguredEnv();
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    await expect(
      runHogQLQuery(
        "SELECT 1",
        {},
        { fetchImpl: fetchImpl as typeof fetch, timeoutMs: 10 },
      ),
    ).rejects.toThrow();
  });

  it("defaults the timeout to 25 seconds", () => {
    expect(DEFAULT_HOGQL_TIMEOUT_MS).toBe(25_000);
  });
});
