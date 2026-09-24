import { isMaintenanceActive } from "./maintenanceStatus";

describe("isMaintenanceActive", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(impl: () => Promise<unknown>) {
    global.fetch = jest.fn(impl) as unknown as typeof fetch;
  }

  it("is false only when the endpoint says so", async () => {
    mockFetch(async () => ({
      ok: true,
      json: async () => ({ active: false }),
    }));
    await expect(isMaintenanceActive()).resolves.toBe(false);
  });

  it("is true when the endpoint says active", async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ active: true }) }));
    await expect(isMaintenanceActive()).resolves.toBe(true);
  });

  it.each([
    ["non-2xx", async () => ({ ok: false, json: async () => ({}) })],
    [
      "network error",
      async () => {
        throw new Error("offline");
      },
    ],
    ["malformed body", async () => ({ ok: true, json: async () => ({}) })],
  ])("treats %s as still active", async (_label, impl) => {
    mockFetch(impl);
    await expect(isMaintenanceActive()).resolves.toBe(true);
  });
});
