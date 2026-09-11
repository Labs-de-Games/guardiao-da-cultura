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
jest.mock("@/lib/edital/server/metrics", () => ({
  fetchSessionDuration: (...args: unknown[]) =>
    mockFetchSessionDuration(...args),
  fetchCriticalErrors: (...args: unknown[]) => mockFetchCriticalErrors(...args),
}));

import { NextRequest } from "next/server";
import { __createScopeForTests } from "@/lib/edital/server/scope";
import { GET } from "./route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/report.csv");
}

describe("GET /api/edital/report.csv", () => {
  beforeEach(() => {
    mockResolveEditalRequestContext.mockReset();
    mockFetchSessionDuration.mockReset();
    mockFetchCriticalErrors.mockReset();
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

  it("returns a CSV with the correct content type and byte-wise UTF-8 BOM", async () => {
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
    });
    mockFetchCriticalErrors.mockResolvedValue({
      total: 2,
      byErrorCode: { asset_load_failed: 2 },
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
    expect(text).toContain("avg_session_duration_seconds;300");
    expect(text).toContain("critical_errors_asset_load_failed;2");
  });

  it("caps the number of CSV rows at MAX_CSV_ROWS", async () => {
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
    });
    const manyErrorCodes = Object.fromEntries(
      Array.from({ length: 2000 }, (_, i) => [`error_${i}`, 1]),
    );
    mockFetchCriticalErrors.mockResolvedValue({
      total: 2000,
      byErrorCode: manyErrorCodes,
    });

    const response = await GET(makeRequest());
    const text = await response.text();
    const lineCount = text.trim().split("\r\n").length;

    // Header row + up to MAX_CSV_ROWS data rows.
    expect(lineCount).toBeLessThanOrEqual(1001);
  });
});
