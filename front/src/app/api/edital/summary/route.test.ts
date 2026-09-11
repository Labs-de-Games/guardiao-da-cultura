/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const { TextEncoder, TextDecoder } = require("node:util");
if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as Record<string, unknown>).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as Record<string, unknown>).TextDecoder = TextDecoder;
}

const mockResolveEditalRequestContext = jest.fn();
jest.mock("@/lib/edital/server/routeGuard", () => ({
  resolveEditalRequestContext: (...args: unknown[]) =>
    mockResolveEditalRequestContext(...args),
}));

const mockFetchSummary = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchSummary: (...args: unknown[]) => mockFetchSummary(...args),
}));

import { NextRequest } from "next/server";
import { __createScopeForTests } from "@/lib/edital/server/scope";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/summary");
}

describe("GET /api/edital/summary", () => {
  beforeEach(() => {
    mockResolveEditalRequestContext.mockReset();
    mockFetchSummary.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "unauthenticated",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockFetchSummary).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid params", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "invalid-params",
      message: "bad dateRange",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(400);
    expect(mockFetchSummary).not.toHaveBeenCalled();
  });

  it("returns linked:false with zero upstream calls when unlinked", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({ kind: "unlinked" });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ linked: false, data: null });
    expect(mockFetchSummary).not.toHaveBeenCalled();
  });

  it("returns linked:true with fetched data on success", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchSummary.mockResolvedValue({ landing_page_viewed: 100 });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      linked: true,
      data: { landing_page_viewed: 100 },
    });
    expect(mockFetchSummary).toHaveBeenCalledWith(scope, range);
  });
});
