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
const mockFetchCompletionRate = jest.fn();
const mockFetchPhaseProgress = jest.fn();
const mockFetchPhaseQuizPassRate = jest.fn();
const mockFetchPhaseClueUsage = jest.fn();
const mockFetchPhaseStars = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchSummary: (...args: unknown[]) => mockFetchSummary(...args),
  fetchCompletionRate: (...args: unknown[]) => mockFetchCompletionRate(...args),
  fetchPhaseProgress: (...args: unknown[]) => mockFetchPhaseProgress(...args),
  fetchPhaseQuizPassRate: (...args: unknown[]) =>
    mockFetchPhaseQuizPassRate(...args),
  fetchPhaseClueUsage: (...args: unknown[]) => mockFetchPhaseClueUsage(...args),
  fetchPhaseStars: (...args: unknown[]) => mockFetchPhaseStars(...args),
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
    mockFetchCompletionRate.mockReset();
    mockFetchPhaseProgress.mockReset();
    mockFetchPhaseQuizPassRate.mockReset();
    mockFetchPhaseClueUsage.mockReset();
    mockFetchPhaseStars.mockReset();
    mockFetchCompletionRate.mockResolvedValue({
      value: 0,
      numerator: 0,
      denominator: 0,
    });
    mockFetchPhaseProgress.mockResolvedValue([]);
    mockFetchPhaseQuizPassRate.mockResolvedValue([]);
    mockFetchPhaseClueUsage.mockResolvedValue([]);
    mockFetchPhaseStars.mockResolvedValue([]);
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
      completionRate: { value: 0, numerator: 0, denominator: 0 },
      averageProgress: { value: 0, numerator: 0, denominator: 0 },
      phaseProgress: [],
      quizPassRate: [],
      clueUsage: [],
      phaseStars: [],
    });
    expect(mockFetchSummary).toHaveBeenCalledWith(scope, range, undefined);
  });

  it("passes ctx.turmaSource through to every fetch call (issue #807)", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
      turmaSource: "group-a",
    });
    mockFetchSummary.mockResolvedValue({});

    await GET(makeRequest());

    expect(mockFetchSummary).toHaveBeenCalledWith(scope, range, "group-a");
    expect(mockFetchCompletionRate).toHaveBeenCalledWith(
      scope,
      range,
      "group-a",
    );
    expect(mockFetchPhaseProgress).toHaveBeenCalledWith(
      scope,
      range,
      "group-a",
    );
  });

  it("computes averageProgress as total level-completions over players*levelCount", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchSummary.mockResolvedValue({ gameplay_started: 100 });
    mockFetchPhaseProgress.mockResolvedValue([
      {
        levelId: "level_01",
        levelNumber: 1,
        label: "L1",
        reached: 100,
        completed: 80,
      },
      {
        levelId: "level_02",
        levelNumber: 2,
        label: "L2",
        reached: 80,
        completed: 40,
      },
      {
        levelId: "level_03",
        levelNumber: 3,
        label: "L3",
        reached: 40,
        completed: 20,
      },
      {
        levelId: "level_04",
        levelNumber: 4,
        label: "L4",
        reached: 20,
        completed: 10,
      },
    ]);

    const response = await GET(makeRequest());
    const data = await response.json();

    // (80+40+20+10) completions over 100 players * 4 levels = 150/400.
    expect(data.averageProgress).toEqual({
      value: 150 / 400,
      numerator: 150,
      denominator: 400,
    });
  });
});
