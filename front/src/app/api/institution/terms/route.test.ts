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

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockServerEnv = {
  server: {
    authOauthUpsertToken: "upsert-token",
    backendInternalUrl: "http://back:3001",
  },
  client: { apiUrl: "http://localhost:3001" },
};
jest.mock("@/lib/env-server", () => ({
  get serverEnv() {
    return mockServerEnv;
  },
}));

import { NextRequest } from "next/server";
import { INSTITUTION_TERMS_VERSION } from "@/lib/consent/institutionTerms";
import { POST } from "./route";

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "user-1",
      role: "institution",
      institutionSlug: "escola-teste",
      ...overrides,
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/institution/terms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  termsAccepted: true,
  termsVersion: INSTITUTION_TERMS_VERSION,
};

const fetchMock = jest.fn();
const originalFetch = global.fetch;

describe("POST /api/institution/terms", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    fetchMock.mockReset();
    global.fetch = fetchMock;
    mockServerEnv.server.authOauthUpsertToken = "upsert-token";
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("refuses an unauthenticated caller", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a non-institution session", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "player" }));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body that does not accept the terms", async () => {
    mockAuth.mockResolvedValue(makeSession());

    const response = await POST(
      makeRequest({ termsAccepted: false, termsVersion: "2026-09-28" }),
    );

    expect(response.status).toBe(400);
    // A request that cannot succeed must never become a server-to-server
    // call carrying the shared upsert token.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a body with no version", async () => {
    mockAuth.mockResolvedValue(makeSession());

    const response = await POST(makeRequest({ termsAccepted: true }));

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("takes the userId from the session, never from the body", async () => {
    mockAuth.mockResolvedValue(makeSession());
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ termsAccepted: true }),
    });

    const response = await POST(
      makeRequest({ ...validBody, userId: "someone-else" }),
    );

    expect(response.status).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent.userId).toBe("user-1");
  });

  it("forwards the upsert token to the backend", async () => {
    mockAuth.mockResolvedValue(makeSession());
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ termsAccepted: true }),
    });

    await POST(makeRequest(validBody));

    expect(fetchMock).toHaveBeenCalledWith(
      "http://back:3001/api/v1/auth/oauth/consent",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-oauth-upsert-token": "upsert-token",
        }),
      }),
    );
  });

  it("passes a 400 through so the page can tell the user to reload", async () => {
    mockAuth.mockResolvedValue(makeSession());
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({}),
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
  });

  it("collapses an unexpected backend status into 502", async () => {
    mockAuth.mockResolvedValue(makeSession());
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(502);
  });

  it("refuses when the upsert token is not configured", async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockServerEnv.server.authOauthUpsertToken = "";

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
