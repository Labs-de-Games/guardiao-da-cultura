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

describe("env-server — empty-string env vars", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, RESPONSIVEVOICE_API_KEY: "test-key" };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("falls back to the default cache TTL when POSTHOG_QUERY_CACHE_TTL_MS is empty", async () => {
    process.env.POSTHOG_QUERY_CACHE_TTL_MS = "";

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.editalQueryCacheTtlMs).toBe(300000);
  });

  it("falls back to the default query host when POSTHOG_QUERY_HOST is empty", async () => {
    process.env.POSTHOG_QUERY_HOST = "";

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.editalPosthogQueryHost).toBe(
      "https://us.posthog.com",
    );
  });

  it("treats an empty EDITAL_PERIOD_START as unset", async () => {
    process.env.EDITAL_PERIOD_START = "";

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.editalPeriodStart).toBeUndefined();
  });

  // Regression for #799: `cp .env.example .env` and Compose's `${VAR:-}` both
  // hand the container "", which must mean "no key" (route answers 503), not
  // a ZodError (route answers 500).
  it("treats an empty RESPONSIVEVOICE_API_KEY as unset", async () => {
    process.env.RESPONSIVEVOICE_API_KEY = "";

    const { serverEnv } = await import("./env-server");

    expect(() => serverEnv.server).not.toThrow();
    expect(serverEnv.server.responsivevoiceApiKey).toBeUndefined();
  });

  it("boots without RESPONSIVEVOICE_API_KEY at all", async () => {
    delete process.env.RESPONSIVEVOICE_API_KEY;

    const { serverEnv } = await import("./env-server");

    expect(() => serverEnv.server).not.toThrow();
    expect(serverEnv.server.responsivevoiceApiKey).toBeUndefined();
  });
});

describe("env-server — AUTH_URL guard", () => {
  const ORIGINAL_ENV = process.env;

  function setNonDevelopmentAuthEnv(): void {
    process.env.NEXT_PUBLIC_ENV = "staging";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.AUTH_TRUST_HOST = "true";
  }

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, RESPONSIVEVOICE_API_KEY: "test-key" };
    delete process.env.AUTH_URL;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("is optional in development", async () => {
    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.authUrl).toBeUndefined();
  });

  it("is required outside development", async () => {
    setNonDevelopmentAuthEnv();

    const { serverEnv } = await import("./env-server");

    expect(() => serverEnv.server).toThrow(
      "AUTH_URL is required outside development",
    );
  });

  it("treats an empty AUTH_URL as missing outside development", async () => {
    setNonDevelopmentAuthEnv();
    process.env.AUTH_URL = "";

    const { serverEnv } = await import("./env-server");

    expect(() => serverEnv.server).toThrow(
      "AUTH_URL is required outside development",
    );
  });

  it("rejects an AUTH_URL with a path", async () => {
    setNonDevelopmentAuthEnv();
    process.env.AUTH_URL = "https://staging.example.com/app";

    const { serverEnv } = await import("./env-server");

    expect(() => serverEnv.server).toThrow(
      "AUTH_URL must be an origin only (no path)",
    );
  });

  it("accepts an origin-only AUTH_URL outside development", async () => {
    setNonDevelopmentAuthEnv();
    process.env.AUTH_URL = "https://staging.example.com";

    const { serverEnv } = await import("./env-server");

    expect(serverEnv.server.authUrl).toBe("https://staging.example.com");
  });
});

describe("env-server — EDITAL_MOCK_DATA guard", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, EDITAL_MOCK_DATA: "true" };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function setNodeEnv(value: string): void {
    (process.env as Record<string, string>).NODE_ENV = value;
  }

  it("serves mock data under next dev", async () => {
    setNodeEnv("development");
    const { editalMockDataScenario, isEditalPosthogConfigured } = await import(
      "./env-server"
    );

    expect(editalMockDataScenario()).toBe("default");
    expect(isEditalPosthogConfigured()).toBe(true);
  });

  it.each([
    "production",
    "test",
  ])("ignores EDITAL_MOCK_DATA under NODE_ENV=%s", async (nodeEnv) => {
    setNodeEnv(nodeEnv);
    const { editalMockDataScenario } = await import("./env-server");

    expect(editalMockDataScenario()).toBeNull();
  });

  it("is off when EDITAL_MOCK_DATA is unset", async () => {
    setNodeEnv("development");
    delete process.env.EDITAL_MOCK_DATA;
    const { editalMockDataScenario } = await import("./env-server");

    expect(editalMockDataScenario()).toBeNull();
  });
});
