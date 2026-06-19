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

  it("maps badges from API response", async () => {
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
    const badges = await fetchBadges();

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

  it("falls back to local mock badges when API fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Internal Server Error"));

    const { fetchBadges } = await import("./badgesApi");
    const badges = await fetchBadges();

    expect(mockGet).toHaveBeenCalledWith("/badges");
    expect(badges).toEqual(MOCK_BADGES);
  });
});
