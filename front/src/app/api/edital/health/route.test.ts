/**
 * @jest-environment node
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// Polyfill web globals needed by next/server before importing the route —
// mirrors app/api/tts/synthesize/route.test.ts's preamble.
const { TextEncoder, TextDecoder } = require("node:util");
if (typeof globalThis.TextEncoder === "undefined") {
  (globalThis as Record<string, unknown>).TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  (globalThis as Record<string, unknown>).TextDecoder = TextDecoder;
}

const mockIsEditalPosthogConfigured = jest.fn();
jest.mock("@/lib/env-server", () => ({
  isEditalPosthogConfigured: () => mockIsEditalPosthogConfigured(),
}));

import { GET } from "./route";

describe("GET /api/edital/health", () => {
  it("returns configured:false when nothing is set", async () => {
    mockIsEditalPosthogConfigured.mockReturnValue(false);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ configured: false });
  });

  it("returns configured:true when the PostHog key/project id are set", async () => {
    mockIsEditalPosthogConfigured.mockReturnValue(true);

    const response = await GET();
    const data = await response.json();

    expect(data).toEqual({ configured: true });
  });

  it("never calls any upstream fetch", async () => {
    const fetchSpy = jest.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    mockIsEditalPosthogConfigured.mockReturnValue(true);
    await GET();

    expect(fetchSpy).not.toHaveBeenCalled();
    globalThis.fetch = originalFetch;
  });
});
