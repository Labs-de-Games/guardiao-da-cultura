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

const mockListCampaignLinks = jest.fn();
const mockCreateCampaignLink = jest.fn();
jest.mock("@/lib/edital/server/campaignLinks", () => {
  const actual = jest.requireActual("@/lib/edital/server/campaignLinks");
  return {
    ...actual,
    listCampaignLinks: (...args: unknown[]) => mockListCampaignLinks(...args),
    createCampaignLink: (...args: unknown[]) => mockCreateCampaignLink(...args),
  };
});

import { NextRequest } from "next/server";
import { GET, POST } from "./route";

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

function makeGetRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/links");
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/edital/links", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/edital/links", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockListCampaignLinks.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(401);
    expect(mockListCampaignLinks).not.toHaveBeenCalled();
  });

  it("returns linked:false with zero upstream calls for a player-role session", async () => {
    mockAuth.mockResolvedValue(makeSession({ role: "player" }));

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(data).toEqual({ linked: false, data: null });
    expect(mockListCampaignLinks).not.toHaveBeenCalled();
  });

  it("returns linked:false for an unlinked institution account", async () => {
    mockAuth.mockResolvedValue(makeSession({ institutionSlug: null }));

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(data).toEqual({ linked: false, data: null });
    expect(mockListCampaignLinks).not.toHaveBeenCalled();
  });

  it("returns links built with the caller's own slug", async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockListCampaignLinks.mockResolvedValue([
      {
        id: "id-1",
        institutionSlug: "escola-teste",
        source: "group-a",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);

    const response = await GET(makeGetRequest());
    const data = await response.json();

    expect(data.linked).toBe(true);
    expect(data.data).toEqual([
      {
        id: "id-1",
        source: "group-a",
        // No AUTH_URL in development, so the request origin is used.
        url: "http://localhost:3000/?utm_institution=escola-teste&utm_source=group-a",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });
});

describe("POST /api/edital/links", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockCreateCampaignLink.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(makePostRequest({ source: "group-a" }));

    expect(response.status).toBe(401);
    expect(mockCreateCampaignLink).not.toHaveBeenCalled();
  });

  it("rejects an invalid source without calling the backend", async () => {
    mockAuth.mockResolvedValue(makeSession());

    const response = await POST(makePostRequest({ source: "Grupo A!" }));

    expect(response.status).toBe(400);
    expect(mockCreateCampaignLink).not.toHaveBeenCalled();
  });

  it("creates a link using only the session's own slug, ignoring any client-supplied slug", async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockCreateCampaignLink.mockResolvedValue({
      id: "id-1",
      institutionSlug: "escola-teste",
      source: "group-a",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const response = await POST(
      makePostRequest({ source: "group-a", institutionSlug: "escola-b" }),
    );
    const data = await response.json();

    expect(mockCreateCampaignLink).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "escola-teste" }),
      "group-a",
    );
    expect(data.data.url).toContain("utm_institution=escola-teste");
    expect(data.data.url).not.toContain("escola-b");
  });
});
