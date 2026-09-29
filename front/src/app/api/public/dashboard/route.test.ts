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

jest.mock("server-only", () => ({}));

const mockResolveDateRange = jest.fn();
jest.mock("@/lib/edital/server/period", () => ({
  resolveDateRange: (...args: unknown[]) => mockResolveDateRange(...args),
}));

const mockFetchGlobalPlayers = jest.fn();
const mockOtherMetric = jest.fn();
jest.mock("@/lib/edital/server/globalMetrics", () => ({
  fetchGlobalPlayers: (...args: unknown[]) => mockFetchGlobalPlayers(...args),
  fetchInstitutionCount: () => mockOtherMetric(),
  fetchTurmaCount: () => mockOtherMetric(),
  fetchGlobalCompletionRate: () => mockOtherMetric(),
  fetchGlobalEntryRate: () => mockOtherMetric(),
  fetchGlobalPhaseProgression: () => mockOtherMetric(),
  fetchGlobalPhaseDetail: () => mockOtherMetric(),
  fetchGlobalOriginSplit: () => mockOtherMetric(),
  fetchGlobalPlayerTrend: () => mockOtherMetric(),
  fetchGlobalSessionDuration: () => mockOtherMetric(),
}));

import { NextRequest } from "next/server";
import { HogQLNotConfiguredError } from "@/lib/edital/server/hogql";
import { GET } from "./route";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/public/dashboard${query}`);
}

describe("GET /api/public/dashboard", () => {
  const range = { from: new Date(0), to: new Date(1) };

  beforeEach(() => {
    mockResolveDateRange.mockReset().mockReturnValue(range);
    mockFetchGlobalPlayers.mockReset().mockResolvedValue(10);
    mockOtherMetric.mockReset().mockResolvedValue(null);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 200 with the aggregated metrics", async () => {
    const response = await GET(makeRequest("?dateRange=30d"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.playersUnique).toBe(10);
    expect(mockFetchGlobalPlayers).toHaveBeenCalledWith(range);
  });

  it("returns 400 for a malformed dateRange", async () => {
    const response = await GET(makeRequest("?dateRange=bogus"));

    expect(response.status).toBe(400);
    expect(mockResolveDateRange).not.toHaveBeenCalled();
  });

  it("propagates a server config error instead of returning 400", async () => {
    mockResolveDateRange.mockImplementation(() => {
      throw new Error("config broken");
    });

    await expect(GET(makeRequest("?dateRange=30d"))).rejects.toThrow(
      "config broken",
    );
  });

  it("returns 503 without leaking details when PostHog is not configured", async () => {
    mockFetchGlobalPlayers.mockRejectedValue(new HogQLNotConfiguredError());

    const response = await GET(makeRequest("?dateRange=30d"));
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data).toEqual({ error: "Dashboard indisponível" });
  });

  it("returns 502 without leaking details on an upstream failure", async () => {
    mockFetchGlobalPlayers.mockRejectedValue(
      new Error("secret upstream detail"),
    );

    const response = await GET(makeRequest("?dateRange=30d"));
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data).toEqual({ error: "Erro ao carregar dashboard" });
    expect(JSON.stringify(data)).not.toContain("secret upstream detail");
  });
});
