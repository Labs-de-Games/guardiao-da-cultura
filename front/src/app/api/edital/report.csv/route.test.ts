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
const mockFetchPhaseProgress = jest.fn();
const mockFetchPhaseQuizPassRate = jest.fn();
const mockFetchPhaseClueUsage = jest.fn();
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchSessionDuration: (...args: unknown[]) =>
    mockFetchSessionDuration(...args),
  fetchQuizPassRate: (...args: unknown[]) => mockFetchQuizPassRate(...args),
  fetchCompletionRate: (...args: unknown[]) => mockFetchCompletionRate(...args),
  fetchPhaseProgress: (...args: unknown[]) => mockFetchPhaseProgress(...args),
  fetchPhaseQuizPassRate: (...args: unknown[]) =>
    mockFetchPhaseQuizPassRate(...args),
  fetchPhaseClueUsage: (...args: unknown[]) => mockFetchPhaseClueUsage(...args),
}));

import { NextRequest } from "next/server";
import { __createScopeForTests } from "@/lib/edital/server/scope";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/report.csv");
}

const ZERO_RATE = { value: 0, numerator: 0, denominator: 0 };

describe("GET /api/edital/report.csv", () => {
  beforeEach(() => {
    mockResolveEditalRequestContext.mockReset();
    mockFetchSessionDuration.mockReset();
    mockFetchQuizPassRate.mockReset();
    mockFetchCompletionRate.mockReset();
    mockFetchPhaseProgress.mockReset();
    mockFetchPhaseQuizPassRate.mockReset();
    mockFetchPhaseClueUsage.mockReset();
    mockFetchQuizPassRate.mockResolvedValue(ZERO_RATE);
    mockFetchCompletionRate.mockResolvedValue(ZERO_RATE);
    mockFetchPhaseProgress.mockResolvedValue([]);
    mockFetchPhaseQuizPassRate.mockResolvedValue([]);
    mockFetchPhaseClueUsage.mockResolvedValue([]);
  });

  it("returns 401 when there is no session", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "unauthenticated",
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(401);
  });

  it("returns 404 when unlinked — nothing to export", async () => {
    mockResolveEditalRequestContext.mockResolvedValue({ kind: "unlinked" });

    const response = await GET(makeRequest());

    expect(response.status).toBe(404);
    expect(mockFetchSessionDuration).not.toHaveBeenCalled();
  });

  it("returns a CSV with the correct content type, byte-wise UTF-8 BOM, and self-describing metadata rows", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
      turmaSource: "group-a",
    });
    mockFetchSessionDuration.mockResolvedValue({
      avgSeconds: 300,
      medianSeconds: 250,
      sessionsStarted: 120,
    });

    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "relatorio-edital.csv",
    );

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer[0]).toBe(0xef);
    expect(buffer[1]).toBe(0xbb);
    expect(buffer[2]).toBe(0xbf);

    const text = buffer.toString("utf-8");
    expect(text).toContain("institution;escola-teste");
    expect(text).toContain("turma;group-a");
    expect(text).toContain("sessions_started;120");
    expect(text).toContain("avg_session_duration_seconds;300");
  });

  it("defaults turma metadata to 'toda a instituição' when institution-wide", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchSessionDuration.mockResolvedValue({
      avgSeconds: 1,
      medianSeconds: 1,
      sessionsStarted: 1,
    });

    const response = await GET(makeRequest());
    const text = await response.text();

    expect(text).toContain("turma;toda a instituição");
  });

  it("includes one row per level for reached/completed/quiz pass rate/clue uses", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchSessionDuration.mockResolvedValue({
      avgSeconds: 1,
      medianSeconds: 1,
      sessionsStarted: 1,
    });
    mockFetchPhaseProgress.mockResolvedValue([
      {
        levelId: "level_01",
        levelNumber: 1,
        label: "L1",
        reached: 100,
        completed: 80,
      },
    ]);
    mockFetchPhaseQuizPassRate.mockResolvedValue([
      {
        levelId: "level_01",
        levelNumber: 1,
        label: "L1",
        rate: { value: 0.5, numerator: 5, denominator: 10 },
      },
    ]);
    mockFetchPhaseClueUsage.mockResolvedValue([
      { levelId: "level_01", levelNumber: 1, label: "L1", clueUses: 7 },
    ]);

    const response = await GET(makeRequest());
    const text = await response.text();

    expect(text).toContain("phase_1_reached;100");
    expect(text).toContain("phase_1_completed;80");
    expect(text).toContain("phase_1_clue_uses;7");
  });

  it("never exceeds MAX_CSV_ROWS data rows", async () => {
    const scope = __createScopeForTests("escola-teste");
    const range = { from: new Date(0), to: new Date() };
    mockResolveEditalRequestContext.mockResolvedValue({
      kind: "ok",
      scope,
      range,
    });
    mockFetchSessionDuration.mockResolvedValue({
      avgSeconds: 1,
      medianSeconds: 1,
      sessionsStarted: 1,
    });

    const response = await GET(makeRequest());
    const text = await response.text();
    const lineCount = text.trim().split("\r\n").length;

    // Header row + metadata + summary + per-phase rows.
    expect(lineCount).toBeLessThanOrEqual(1001);
  });
});
