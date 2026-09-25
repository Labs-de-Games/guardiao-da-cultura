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

const mockFetchFunnel = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchFunnel: (...args: unknown[]) => mockFetchFunnel(...args),
}));

import { NextRequest } from "next/server";
import { __createScopeForTests } from "@/lib/edital/server/scope";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/funnel");
}

describe("GET /api/edital/funnel", () => {
  beforeEach(() => {
    mockResolveEditalRequestContext.mockReset();
    mockFetchFunnel.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "unauthenticated",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockFetchFunnel).not.toHaveBeenCalled();
  });

  it("returns linked:false with zero upstream calls when unlinked", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({ kind: "unlinked" });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data).toEqual({ linked: false, data: null });
    expect(mockFetchFunnel).not.toHaveBeenCalled();
  });

  it("returns the monotonic funnel on success", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchFunnel.mockResolvedValue([
      { label: "landing_page_viewed", value: 100 },
      { label: "play_clicked", value: 80 },
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data.linked).toBe(true);
    expect(data.data).toEqual([
      { label: "landing_page_viewed", value: 100 },
      { label: "play_clicked", value: 80 },
    ]);
  });
});
