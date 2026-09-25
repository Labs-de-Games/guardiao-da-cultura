/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

jest.mock("../../env-server", () => ({
  serverEnv: {
    client: { apiUrl: "http://localhost:3001" },
    server: {
      backendInternalUrl: "http://back:3001",
      authOauthUpsertToken: "test-token",
    },
  },
}));

import {
  CampaignLinkApiError,
  createCampaignLink,
  deleteCampaignLink,
  listCampaignLinks,
} from "./campaignLinks";
import { __createScopeForTests } from "./scope";

const scope = __createScopeForTests("escola-teste");

describe("campaignLinks server module", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("lists links scoped to the caller's own slug, never a different one", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await listCampaignLinks(scope);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "http://back:3001/api/v1/campaign-links?institutionSlug=escola-teste",
    );
    expect(init.headers["x-oauth-upsert-token"]).toBe("test-token");
  });

  it("creates a link with the caller's own slug in the request body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "id-1",
        institutionSlug: "escola-teste",
        source: "group-a",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
    });

    await createCampaignLink(scope, "group-a");

    const [, init] = mockFetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      institutionSlug: "escola-teste",
      source: "group-a",
    });
  });

  it("throws CampaignLinkApiError with status 409 on duplicate create", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 409 });

    await expect(createCampaignLink(scope, "group-a")).rejects.toMatchObject({
      status: 409,
    });
  });

  it("deletes with institutionSlug in the query string, from scope only", async () => {
    mockFetch.mockResolvedValue({ ok: true });

    await deleteCampaignLink(scope, "id-1");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "http://back:3001/api/v1/campaign-links/id-1?institutionSlug=escola-teste",
    );
  });

  it("throws CampaignLinkApiError on delete failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });

    await expect(deleteCampaignLink(scope, "id-1")).rejects.toBeInstanceOf(
      CampaignLinkApiError,
    );
  });
});
