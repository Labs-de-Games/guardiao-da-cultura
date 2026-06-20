import { GameEventType } from "@/game/types/AnalyticsTypes";
import { createGamePersistence } from "./gamePersistence";

const mockFetchBadges = jest.fn();
const mockFetchUserBadges = jest.fn();
const mockUnlockBadgeOnServer = jest.fn();
const mockAddGuestBadge = jest.fn();
const mockGetGuestBadgeIds = jest.fn();
const mockGetUserCollectibles = jest.fn();
const mockSubmitScore = jest.fn();
const mockSendQuizOutcomeEvent = jest.fn();
const mockSendGameEvent = jest.fn();

jest.mock("@/lib/badgesApi", () => ({
  fetchBadges: (...args: unknown[]) => mockFetchBadges(...args),
  fetchUserBadges: (...args: unknown[]) => mockFetchUserBadges(...args),
  unlockBadgeOnServer: (...args: unknown[]) => mockUnlockBadgeOnServer(...args),
}));

jest.mock("@/lib/badgesStorage", () => ({
  addGuestBadge: (...args: unknown[]) => mockAddGuestBadge(...args),
  getGuestBadgeIds: (...args: unknown[]) => mockGetGuestBadgeIds(...args),
}));

jest.mock("@/lib/scoresApi", () => ({
  getUserCollectibles: (...args: unknown[]) => mockGetUserCollectibles(...args),
  submitScore: (...args: unknown[]) => mockSubmitScore(...args),
}));

jest.mock("@/lib/gameEventsApi", () => ({
  sendQuizOutcomeEvent: (...args: unknown[]) =>
    mockSendQuizOutcomeEvent(...args),
}));

jest.mock("@/lib/analyticsApi", () => ({
  sendGameEvent: (...args: unknown[]) => mockSendGameEvent(...args),
}));

describe("createGamePersistence", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchBadges.mockReset();
    mockFetchUserBadges.mockReset();
    mockUnlockBadgeOnServer.mockReset();
    mockAddGuestBadge.mockReset();
    mockGetGuestBadgeIds.mockReset();
    mockGetUserCollectibles.mockReset();
    mockSubmitScore.mockReset();
    mockSendQuizOutcomeEvent.mockReset();
    mockSendGameEvent.mockReset();
  });

  it("uses local persistence in guest mode", async () => {
    mockFetchBadges.mockResolvedValueOnce([{ id: "b1" }]);
    mockGetGuestBadgeIds.mockReturnValueOnce(["b1"]);

    const persistence = createGamePersistence({
      mode: "guest",
      actorId: "guest-1",
    });

    await persistence.getBadgeCatalog();
    await persistence.getUnlockedBadgeIds();
    await persistence.unlockBadge("badge-1");
    await persistence.saveScore({
      levelId: "level_01",
      totalQuarters: 4,
      totalStars: 1,
      rating: "C",
      floors: [],
      quiz: {
        totalQuestions: 1,
        correctAnswers: 1,
        accuracyPercent: 100,
        quartersEarned: 1,
      },
      collectibles: {
        total: 0,
        interactionsCount: 0,
        quartersEarned: 0,
      },
      collectedCollectibles: [
        {
          collectibleId: "clue_1",
          collectibleType: "CLUE_VILLAIN",
          levelId: "level_01",
        },
      ],
    });

    const collectibles = await persistence.loadCollectibles("level_01");

    expect(mockFetchBadges).toHaveBeenCalledWith({ source: "guest" });
    expect(mockGetGuestBadgeIds).toHaveBeenCalledWith("guest-1");
    expect(mockAddGuestBadge).toHaveBeenCalledWith("guest-1", "badge-1");
    expect(collectibles).toEqual([
      {
        collectibleId: "clue_1",
        collectibleType: "CLUE_VILLAIN",
      },
    ]);

    expect(mockSubmitScore).not.toHaveBeenCalled();
    expect(mockGetUserCollectibles).not.toHaveBeenCalled();
    expect(mockSendQuizOutcomeEvent).not.toHaveBeenCalled();
    expect(mockSendGameEvent).not.toHaveBeenCalled();
  });

  it("uses server persistence in auth mode", async () => {
    mockFetchBadges.mockResolvedValueOnce([{ id: "b-auth" }]);
    mockFetchUserBadges.mockResolvedValueOnce([{ badgeId: "b-auth" }]);
    mockGetUserCollectibles.mockResolvedValueOnce([
      {
        collectibleId: "collect_1",
        collectibleType: "COLLECT",
      },
    ]);

    const persistence = createGamePersistence({
      mode: "auth",
      actorId: "user-1",
    });

    await persistence.getBadgeCatalog();
    const unlocked = await persistence.getUnlockedBadgeIds();
    await persistence.unlockBadge("badge-auth");
    const collectibles = await persistence.loadCollectibles("level_01");

    await persistence.saveScore({
      levelId: "level_01",
      totalQuarters: 8,
      totalStars: 2,
      rating: "B",
      floors: [],
      quiz: {
        totalQuestions: 2,
        correctAnswers: 2,
        accuracyPercent: 100,
        quartersEarned: 2,
      },
      collectibles: {
        total: 1,
        interactionsCount: 1,
        quartersEarned: 1,
      },
      collectedCollectibles: [
        {
          collectibleId: "collect_1",
          collectibleType: "COLLECT",
          levelId: "level_01",
        },
      ],
    });

    await persistence.sendQuizOutcome({
      type: "quiz.completed",
      timestamp: "2026-01-01T00:00:00.000Z",
      metadata: {
        missionId: "m1",
        score: 2,
        totalQuestions: 2,
        accuracyPercent: 100,
        quartersEarned: 2,
        passed: true,
      },
    });

    await persistence.sendBadgeEarnedEvent({
      badgeId: "badge-auth",
      badgeName: "Auth Badge",
    });

    expect(unlocked).toEqual(["b-auth"]);
    expect(collectibles).toEqual([
      {
        collectibleId: "collect_1",
        collectibleType: "COLLECT",
      },
    ]);

    expect(mockFetchBadges).toHaveBeenCalledWith({ source: "auth" });
    expect(mockFetchUserBadges).toHaveBeenCalledTimes(1);
    expect(mockUnlockBadgeOnServer).toHaveBeenCalledWith("badge-auth");
    expect(mockGetUserCollectibles).toHaveBeenCalledWith("user-1", {
      levelId: "level_01",
    });
    expect(mockSubmitScore).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", levelId: "level_01" }),
    );
    expect(mockSendQuizOutcomeEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", type: "quiz.completed" }),
    );
    expect(mockSendGameEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: GameEventType.BADGE_EARNED,
      }),
    );
  });
});
