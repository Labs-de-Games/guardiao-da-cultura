/**
 * @jest-environment node
 */
// The middleware imports next-auth (ESM-only); only its matcher is needed here.
jest.mock("@/auth.config", () => ({ auth: jest.fn() }));

import { config } from "@/middleware";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("returns 200 with an ok status", async () => {
    const response = GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("is not handled by the middleware, so maintenance mode can't affect it", () => {
    const matchesHealth = config.matcher.some((pattern) =>
      pattern.startsWith("/api"),
    );
    expect(matchesHealth).toBe(false);
  });
});
