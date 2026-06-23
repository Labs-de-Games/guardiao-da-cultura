import { MOCK_BADGES } from "./badges.mock";

const mockGet = jest.fn();

jest.mock("./api/client", () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: jest.fn(),
  },
}));

describe("badgesApi", () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it("returns local badge catalog for guest source without API call", async () => {
    const { fetchBadges } = await import("./badgesApi");
    const badges = await fetchBadges({ source: "guest" });

    expect(mockGet).not.toHaveBeenCalled();
    expect(badges).toEqual(MOCK_BADGES);
  });

  it("maps badges from API response for auth source", async () => {
    mockGet.mockResolvedValueOnce({
      data: [
        {
          id: "badge_1",
          name: "Explorer",
          description: "Desc",
          iconUrl: "https://cdn/badges/badge_explorer.png",
          type: "achievement",
          statRequired: "objects_inspected",
          condition: ">=",
          goalValue: 10,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const { fetchBadges } = await import("./badgesApi");
    const badges = await fetchBadges({ source: "auth" });

    expect(mockGet).toHaveBeenCalledWith("/badges");
    expect(badges).toEqual([
      {
        id: "badge_1",
        name: "Explorer",
        description: "Desc",
        stat_required: "objects_inspected",
        condition: ">=",
        goal_value: 10,
        icon_key: "badge_explorer",
      },
    ]);
  });

  it("throws when auth source API call fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Internal Server Error"));

    const { fetchBadges } = await import("./badgesApi");
    await expect(fetchBadges({ source: "auth" })).rejects.toThrow(
      "Internal Server Error",
    );
    expect(mockGet).toHaveBeenCalledWith("/badges");
  });
});
