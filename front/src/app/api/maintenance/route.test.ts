/**
 * @jest-environment node
 */
import { GET } from "./route";

describe("GET /api/maintenance", () => {
  const original = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = original;
  });

  it.each([
    ["true", true],
    ["false", false],
  ])("reports active=%p as %p without caching", async (value, active) => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = value;
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ active });
  });
});
