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
const mockFetchQuizPassRate = jest.fn();
const mockFetchCompletionRate = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchSessionDuration: (...args: unknown[]) =>
    mockFetchSessionDuration(...args),
  fetchQuizPassRate: (...args: unknown[]) => mockFetchQuizPassRate(...args),
  fetchCompletionRate: (...args: unknown[]) => mockFetchCompletionRate(...args),
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
    mockFetchQuizPassRate.mockReset();
    mockFetchCompletionRate.mockReset();
    mockFetchCompletionRate.mockResolvedValue({
      value: 0,
      numerator: 0,
      denominator: 0,
    });
  });

  it("returns 401 when there is no session", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "unauthenticated",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
    expect(mockFetchSessionDuration).not.toHaveBeenCalled();
    expect(mockFetchQuizPassRate).not.toHaveBeenCalled();
  });

  it("returns linked:false with zero upstream calls when unlinked", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({ kind: "unlinked" });

    const response = await GET(makeRequest());
    const data = await response.json();

    expect(data).toEqual({ linked: false, data: null });
    expect(mockFetchSessionDuration).not.toHaveBeenCalled();
    expect(mockFetchQuizPassRate).not.toHaveBeenCalled();
  });

  it("combines session duration, quiz pass rate, and completion rate on success", async () => {
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
    mockFetchQuizPassRate.mockResolvedValue({
      value: 0.8,
      numerator: 40,
      denominator: 50,
    });
    mockFetchCompletionRate.mockResolvedValue({
      value: 0.4,
      numerator: 40,
      denominator: 100,
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
        quizPassRate: { value: 0.8, numerator: 40, denominator: 50 },
        completionRate: { value: 0.4, numerator: 40, denominator: 100 },
      },
    });
  });
});
