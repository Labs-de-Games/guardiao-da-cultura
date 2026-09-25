/**
 * @jest-environment node
 */

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: (...args: unknown[]) => mockAuth(...args),
}));

const mockDeleteCampaignLink = jest.fn();
jest.mock("@/lib/edital/server/campaignLinks", () => {
  const actual = jest.requireActual("@/lib/edital/server/campaignLinks");
  return {
    ...actual,
    deleteCampaignLink: (...args: unknown[]) => mockDeleteCampaignLink(...args),
  };
});

import { DELETE } from "./route";

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

function callDelete(id: string) {
  return DELETE(new Request(`http://localhost:3000/api/edital/links/${id}`), {
    params: Promise.resolve({ id }),
  });
}

describe("DELETE /api/edital/links/[id]", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockDeleteCampaignLink.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await callDelete("id-1");

    expect(response.status).toBe(401);
    expect(mockDeleteCampaignLink).not.toHaveBeenCalled();
  });

  it("returns 403 for an unlinked institution account", async () => {
    mockAuth.mockResolvedValue(makeSession({ institutionSlug: null }));

    const response = await callDelete("id-1");

    expect(response.status).toBe(403);
    expect(mockDeleteCampaignLink).not.toHaveBeenCalled();
  });

  it("deletes using only the session's own slug", async () => {
    mockAuth.mockResolvedValue(makeSession());
    mockDeleteCampaignLink.mockResolvedValue(undefined);

    const response = await callDelete("id-1");
    const data = await response.json();

    expect(mockDeleteCampaignLink).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "escola-teste" }),
      "id-1",
    );
    expect(data).toEqual({ success: true });
  });

  it("surfaces the backend's rejection status when delete fails", async () => {
    mockAuth.mockResolvedValue(makeSession());
    const { CampaignLinkApiError } = jest.requireActual(
      "@/lib/edital/server/campaignLinks",
    );
    mockDeleteCampaignLink.mockRejectedValue(
      new CampaignLinkApiError("Este link não pertence à sua instituição", 403),
    );

    const response = await callDelete("id-1");

    expect(response.status).toBe(403);
  });
});
