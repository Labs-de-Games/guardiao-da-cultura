/**
 * @jest-environment node
 */

// The real "server-only" package throws unconditionally on plain
// `require`/`import` (it only resolves to a no-op under Next's bundler-only
// "react-server" export condition) — see node_modules/server-only/index.js.
// Every test that imports the real env-server.ts (not a jest.mock of it)
// must neutralize that import first, exactly as Next's bundler does for the
// server graph.
jest.mock("server-only", () => ({}));

describe("env-server — edital fields", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("boots with all four edital fields unset", async () => {
    process.env.POSTHOG_PERSONAL_API_KEY = undefined;
    process.env.POSTHOG_PROJECT_ID = undefined;
    process.env.POSTHOG_QUERY_HOST = undefined;
    process.env.POSTHOG_QUERY_CACHE_TTL_MS = undefined;
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";

    const { serverEnv } = await import("./env-server");

    expect(() => serverEnv.server).not.toThrow();
    expect(serverEnv.server.editalPosthogPersonalApiKey).toBeUndefined();
    expect(serverEnv.server.editalPosthogProjectId).toBeUndefined();
    expect(serverEnv.server.editalPosthogQueryHost).toBe(
      "https://us.posthog.com",
    );
    expect(serverEnv.server.editalQueryCacheTtlMs).toBe(300000);
  });

  it("reports unconfigured when only one of the two required fields is set", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = undefined;

    const { isEditalPosthogConfigured } = await import("./env-server");

    expect(isEditalPosthogConfigured()).toBe(false);
  });

  it("reports configured when both key and project id are set", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.POSTHOG_PERSONAL_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "12345";

    const { isEditalPosthogConfigured } = await import("./env-server");

    expect(isEditalPosthogConfigured()).toBe(true);
  });

  it("reads a custom cache TTL when set", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.POSTHOG_QUERY_CACHE_TTL_MS = "60000";

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.editalQueryCacheTtlMs).toBe(60000);
  });

  it("backendInternalUrl is undefined when unset (bare npm run dev, no Docker)", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.BACKEND_INTERNAL_URL = undefined;

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.backendInternalUrl).toBeUndefined();
  });

  it("reads BACKEND_INTERNAL_URL when set (Docker Compose)", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.BACKEND_INTERNAL_URL = "http://back:3001";

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.backendInternalUrl).toBe("http://back:3001");
  });

  it("resetServerEnv() forces a re-parse", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "test-key";
    process.env.POSTHOG_PROJECT_ID = "first";

    const { serverEnv, resetServerEnv } = await import("./env-server");
    expect(serverEnv.server.editalPosthogProjectId).toBe("first");

    process.env.POSTHOG_PROJECT_ID = "second";
    resetServerEnv();

    expect(serverEnv.server.editalPosthogProjectId).toBe("second");
  });
});
