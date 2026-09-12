import posthog from "posthog-js";
import type { ProgressionManager } from "../objects/ProgressionManager";
import type { QuestManager } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import type { CollectibleSystem } from "./CollectibleSystem";
import { PersistenceBridge } from "./PersistenceBridge";

// Mock the gamePersistence module
jest.mock("@/lib/persistence/gamePersistence", () => ({
  createGamePersistence: jest.fn(() => ({
    loadCollectibles: jest.fn().mockResolvedValue([]),
    loadProgress: jest.fn().mockResolvedValue(null),
    saveScore: jest.fn().mockResolvedValue(undefined),
    saveProgress: jest.fn().mockResolvedValue(undefined),
    sendQuizOutcome: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock posthog
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

// Mock js-cookie (used by PersistenceBridge to sync currentLevel)
jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

function createMocks() {
  const persistence = {
    loadCollectibles: jest.fn().mockResolvedValue([]),
    loadProgress: jest.fn().mockResolvedValue(null),
    saveScore: jest.fn().mockResolvedValue(undefined),
    saveProgress: jest.fn().mockResolvedValue(undefined),
    sendQuizOutcome: jest.fn().mockResolvedValue(undefined),
  };

  const scoreManager = {
    getPayload: jest.fn().mockReturnValue({
      levelId: "level_01",
      totalQuarters: 100,
      totalStars: 3,
      rating: "A",
      floors: [],
      quiz: {
        totalQuestions: 5,
        correctAnswers: 4,
        accuracyPercent: 80,
        quartersEarned: 2,
      },
      intermediateQuizzes: { total: 0, passed: 0, quartersEarned: 0 },
    }),
  } as unknown as ScoreManager;

  const progressionManager = {
    getState: jest.fn().mockReturnValue({ currentLevel: 1 }),
    hydrate: jest.fn(),
    recordClueUnlocked: jest.fn(),
  } as unknown as ProgressionManager;

  const collectibleSystem = {
    applyCollectedCollectibles: jest.fn(),
    getCollectedCollectibles: jest.fn().mockReturnValue([]),
  } as unknown as CollectibleSystem;

  const questManager = {
    collectInfo: jest.fn(),
  } as unknown as QuestManager;

  return {
    persistence,
    scoreManager,
    progressionManager,
    collectibleSystem,
    questManager,
  };
}

describe("PersistenceBridge", () => {
  let bridge: PersistenceBridge;
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    bridge = new PersistenceBridge(
      "auth",
      "user-1",
      mocks.scoreManager,
      mocks.progressionManager,
      mocks.collectibleSystem,
      mocks.questManager,
      "level_01",
    );
    // Override the internal persistence with our mock
    (
      bridge as unknown as { persistence: typeof mocks.persistence }
    ).persistence = mocks.persistence;
    jest.clearAllMocks();
  });

  describe("initializeCollectibles", () => {
    it("loads collectibles and applies them", async () => {
      mocks.persistence.loadCollectibles.mockResolvedValue([
        { collectibleId: "c1", collectibleType: "CLUE_VILLAIN" },
      ]);

      await bridge.initializeCollectibles();

      expect(
        mocks.collectibleSystem.applyCollectedCollectibles,
      ).toHaveBeenCalledWith([
        { collectibleId: "c1", collectibleType: "CLUE_VILLAIN" },
      ]);
      expect(mocks.progressionManager.recordClueUnlocked).toHaveBeenCalledWith(
        "c1",
        "level_01",
      );
      expect(mocks.questManager.collectInfo).toHaveBeenCalledWith("pista_c1");
    });

    it("handles errors gracefully", async () => {
      jest.spyOn(console, "warn").mockImplementation();
      mocks.persistence.loadCollectibles.mockRejectedValue(
        new Error("network"),
      );

      await expect(bridge.initializeCollectibles()).resolves.toBeUndefined();
    });
  });

  describe("initializeProgression", () => {
    it("hydrates progressionManager when snapshot exists", async () => {
      const snapshot = { currentLevel: 2, totalStars: 5 };
      mocks.persistence.loadProgress.mockResolvedValue(snapshot);

      await bridge.initializeProgression();

      expect(mocks.progressionManager.hydrate).toHaveBeenCalledWith(snapshot);
    });

    it("does not hydrate when snapshot is null", async () => {
      mocks.persistence.loadProgress.mockResolvedValue(null);

      await bridge.initializeProgression();

      expect(mocks.progressionManager.hydrate).not.toHaveBeenCalled();
    });
  });

  describe("submitScore", () => {
    it("saves score and captures posthog event", async () => {
      await bridge.submitScore();

      expect(mocks.persistence.saveScore).toHaveBeenCalledTimes(1);
      expect(mocks.persistence.saveScore).toHaveBeenCalledWith(
        expect.objectContaining({ levelId: "level_01" }),
      );
      expect(posthog.capture).toHaveBeenCalledWith(
        "score_updated",
        expect.any(Object),
      );
    });

    it("dual-emits the canonical score_calculated event (#741)", async () => {
      await bridge.submitScore();

      expect(posthog.capture).toHaveBeenCalledWith(
        "score_calculated",
        expect.objectContaining({ level_id: "level_01" }),
      );
    });

    it("handles errors gracefully", async () => {
      jest.spyOn(console, "error").mockImplementation();
      mocks.persistence.saveScore.mockRejectedValue(new Error("fail"));

      await expect(bridge.submitScore()).resolves.toBeUndefined();
    });
  });

  describe("saveProgress", () => {
    it("saves progression state", async () => {
      await bridge.saveProgress();

      expect(mocks.progressionManager.getState).toHaveBeenCalled();
      expect(mocks.persistence.saveProgress).toHaveBeenCalledWith({
        currentLevel: 1,
      });
    });

    it("handles errors gracefully", async () => {
      jest.spyOn(console, "error").mockImplementation();
      mocks.persistence.saveProgress.mockRejectedValue(new Error("fail"));

      await expect(bridge.saveProgress()).resolves.toBeUndefined();
    });
  });

  describe("sendQuizOutcome", () => {
    it("delegates to persistence", async () => {
      const payload = {
        type: "quiz.completed" as const,
        metadata: {},
        timestamp: "",
      };
      await bridge.sendQuizOutcome(payload);

      expect(mocks.persistence.sendQuizOutcome).toHaveBeenCalledWith(payload);
    });
  });
});
