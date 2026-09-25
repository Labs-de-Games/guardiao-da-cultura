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

const mockFetchCampaigns = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchCampaigns: (...args: unknown[]) => mockFetchCampaigns(...args),
}));

import { NextRequest } from "next/server";
import { __createScopeForTests } from "@/lib/edital/server/scope";
import { GET } from "./route";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/edital/campaigns${query}`);
}

describe("GET /api/edital/campaigns", () => {
  beforeEach(() => {
    mockResolveEditalRequestContext.mockReset();
    mockFetchCampaigns.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "unauthenticated",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockFetchCampaigns).not.toHaveBeenCalled();
  });

  it("returns linked:false with zero upstream calls when unlinked", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({ kind: "unlinked" });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data).toEqual({ linked: false, data: null });
    expect(mockFetchCampaigns).not.toHaveBeenCalled();
  });

  it("ignores a forged ?slug= parameter — no such parameter exists on this route", async () => {
    const scope = __createScopeForTests("escola-a");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchCampaigns.mockResolvedValue([
      { source: "direto", uniquePlayers: 10 },
    ]);

    await GET(makeRequest("?slug=escola-b"));

    // The route never reads searchParams itself — the guard already
    // resolved scope from the session before this handler ran.
    expect(mockFetchCampaigns).toHaveBeenCalledWith(scope, range);
  });

  it("returns the per-source breakdown on success", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchCampaigns.mockResolvedValue([
      { source: "instagram", uniquePlayers: 30 },
      { source: "direto", uniquePlayers: 12 },
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data).toEqual({
      linked: true,
      data: [
        { source: "instagram", uniquePlayers: 30 },
        { source: "direto", uniquePlayers: 12 },
      ],
    });
  });
});
