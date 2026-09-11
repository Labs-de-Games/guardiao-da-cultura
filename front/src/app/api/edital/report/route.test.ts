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

const mockFetchSessionDuration = jest.fn();
const mockFetchCriticalErrors = jest.fn();
const mockFetchQuizPassRate = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchSessionDuration: (...args: unknown[]) =>
    mockFetchSessionDuration(...args),
  fetchCriticalErrors: (...args: unknown[]) => mockFetchCriticalErrors(...args),
  fetchQuizPassRate: (...args: unknown[]) => mockFetchQuizPassRate(...args),
}));

import { NextRequest } from "next/server";
import { __createScopeForTests } from "@/lib/edital/server/scope";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/report");
}

describe("GET /api/edital/report", () => {
  beforeEach(() => {
    mockResolveEditalRequestContext.mockReset();
    mockFetchSessionDuration.mockReset();
    mockFetchCriticalErrors.mockReset();
    mockFetchQuizPassRate.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "unauthenticated",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockFetchSessionDuration).not.toHaveBeenCalled();
    expect(mockFetchCriticalErrors).not.toHaveBeenCalled();
    expect(mockFetchQuizPassRate).not.toHaveBeenCalled();
  });

  it("returns linked:false with zero upstream calls when unlinked", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({ kind: "unlinked" });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data).toEqual({ linked: false, data: null });
    expect(mockFetchSessionDuration).not.toHaveBeenCalled();
    expect(mockFetchCriticalErrors).not.toHaveBeenCalled();
    expect(mockFetchQuizPassRate).not.toHaveBeenCalled();
  });

  it("combines session duration, critical errors, and quiz pass rate on success", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchSessionDuration.mockResolvedValue({
      avgSeconds: 300,
      medianSeconds: 250,
      sessionsStarted: 120,
    });
    mockFetchCriticalErrors.mockResolvedValue({
      total: 3,
      byErrorCode: { asset_load_failed: 3 },
    });
    mockFetchQuizPassRate.mockResolvedValue({
      value: 0.8,
      numerator: 40,
      denominator: 50,
    });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data).toEqual({
      linked: true,
      data: {
        sessionDuration: {
          avgSeconds: 300,
          medianSeconds: 250,
          sessionsStarted: 120,
        },
        criticalErrors: { total: 3, byErrorCode: { asset_load_failed: 3 } },
        quizPassRate: { value: 0.8, numerator: 40, denominator: 50 },
      },
    });
  });
});
