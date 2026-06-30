import { ProgressionEvents } from "../constants/ProgressionEvents";
import type { UserProgressState } from "../types/ProgressionTypes";
import { ProgressionManager } from "./ProgressionManager";

describe("ProgressionManager", () => {
  let manager: ProgressionManager;

  const DEFAULT_STATE: UserProgressState = {
    currentLevel: 1,
    totalStars: 0,
    completedLevels: {},
    clues: {},
    quizResults: {},
  };

  beforeEach(() => {
    manager = new ProgressionManager();
  });

  describe("constructor", () => {
    it("initializes with default state", () => {
      expect(manager.getState()).toEqual(DEFAULT_STATE);
    });
  });

  describe("hydrate", () => {
    it("replaces state from complete snapshot", () => {
      const snapshot: UserProgressState = {
        currentLevel: 3,
        totalStars: 42,
        completedLevels: {
          "level-1": {
            completedAt: "2024-01-01",
            score: 100,
            stars: 3,
          },
        },
        clues: {
          "clue-1": { unlockedAt: "2024-01-01", levelId: "level-1" },
        },
        quizResults: {
          "mission-1": {
            completedAt: "2024-01-01",
            passed: true,
            score: 80,
            totalQuestions: 10,
            accuracyPercent: 80,
            quartersEarned: 2,
            timeSpentMs: 60000,
            attempts: 1,
            payload: null,
          },
        },
      };
      manager.hydrate(snapshot);
      expect(manager.getState()).toEqual(snapshot);
    });

    it("applies defaults when snapshot has missing fields", () => {
      const snapshot = {} as UserProgressState;
      manager.hydrate(snapshot);
      expect(manager.getState()).toEqual(DEFAULT_STATE);
    });

    it("emits PROGRESSION_UPDATED with full state", () => {
      const snapshot: UserProgressState = {
        currentLevel: 2,
        totalStars: 10,
        completedLevels: {},
        clues: {},
        quizResults: {},
      };
      manager.hydrate(snapshot);
      expect(manager.emit).toHaveBeenCalledWith(
        ProgressionEvents.PROGRESSION_UPDATED,
        snapshot,
      );
    });
  });

  describe("getState", () => {
    it("returns a defensive copy", () => {
      manager.hydrate({
        currentLevel: 2,
        totalStars: 10,
        completedLevels: {
          "level-1": {
            completedAt: "2024-01-01",
            score: 100,
            stars: 3,
          },
        },
        clues: { "clue-1": { unlockedAt: "2024-01-01", levelId: "level-1" } },
        quizResults: {},
      });

      const state = manager.getState();
      state.currentLevel = 99;
      state.totalStars = 999;
      state.completedLevels["new-level"] = {
        completedAt: "x",
        score: 0,
        stars: 0,
      };
      state.clues["new-clue"] = { unlockedAt: "x", levelId: "x" };
      state.quizResults["new-mission"] = {
        completedAt: "x",
        passed: false,
        score: 0,
        totalQuestions: 0,
        accuracyPercent: 0,
        quartersEarned: 0,
        timeSpentMs: null,
        attempts: null,
        payload: null,
      };

      const fresh = manager.getState();
      expect(fresh.currentLevel).toBe(2);
      expect(fresh.totalStars).toBe(10);
      expect(fresh.completedLevels["new-level"]).toBeUndefined();
      expect(fresh.clues["new-clue"]).toBeUndefined();
      expect(fresh.quizResults["new-mission"]).toBeUndefined();
    });
  });

  describe("recordLevelCompleted", () => {
    it("stores new completed level record when none exists", () => {
      manager.recordLevelCompleted("level-1", 1, 3, 100, "2024-01-01");
      const state = manager.getState();
      expect(state.completedLevels["level-1"]).toEqual({
        completedAt: "2024-01-01",
        score: 100,
        stars: 3,
      });
    });

    it("upserts best score when existing record has lower values", () => {
      manager.recordLevelCompleted("level-1", 1, 1, 50, "2024-01-01");
      manager.recordLevelCompleted("level-1", 1, 3, 100, "2024-01-02");
      const state = manager.getState();
      expect(state.completedLevels["level-1"]).toEqual({
        completedAt: "2024-01-02",
        score: 100,
        stars: 3,
      });
    });

    it("computes delta stars correctly", () => {
      manager.recordLevelCompleted("level-1", 1, 1, 50, "2024-01-01");
      expect(manager.getState().totalStars).toBe(1);
      manager.recordLevelCompleted("level-1", 1, 3, 100, "2024-01-02");
      expect(manager.getState().totalStars).toBe(3);
    });

    it("does not mutate state when existing record has higher values", () => {
      manager.recordLevelCompleted("level-1", 1, 3, 100, "2024-01-02");
      const stateBefore = manager.getState();
      manager.recordLevelCompleted("level-1", 1, 1, 50, "2024-01-01");
      expect(manager.getState()).toEqual(stateBefore);
    });

    it("advances currentLevel to levelNumber + 1", () => {
      manager.recordLevelCompleted("level-5", 5, 3, 100, "2024-01-01");
      expect(manager.getState().currentLevel).toBe(6);
    });

    it("does not regress currentLevel", () => {
      manager.recordLevelCompleted("level-10", 10, 3, 100, "2024-01-01");
      expect(manager.getState().currentLevel).toBe(11);
      manager.recordLevelCompleted("level-1", 1, 1, 50, "2024-01-01");
      expect(manager.getState().currentLevel).toBe(11);
    });

    it("emits PROGRESSION_UPDATED event", () => {
      manager.recordLevelCompleted("level-1", 1, 3, 100, "2024-01-01");
      expect(manager.emit).toHaveBeenCalledWith(
        ProgressionEvents.PROGRESSION_UPDATED,
        manager.getState(),
      );
    });
  });

  describe("recordClueUnlocked", () => {
    it("stores clue with unlockedAt and levelId", () => {
      manager.recordClueUnlocked("clue-1", "level-1");
      const state = manager.getState();
      expect(state.clues["clue-1"]).toBeDefined();
      expect(state.clues["clue-1"]!.levelId).toBe("level-1");
      expect(state.clues["clue-1"]!.unlockedAt).toBeDefined();
    });

    it("emits PROGRESSION_UPDATED event", () => {
      manager.recordClueUnlocked("clue-1", "level-1");
      expect(manager.emit).toHaveBeenCalledWith(
        ProgressionEvents.PROGRESSION_UPDATED,
        manager.getState(),
      );
    });
  });

  describe("recordQuizResult", () => {
    it("stores quiz result by missionId", () => {
      const data = {
        completedAt: "2024-01-01",
        passed: true,
        score: 80,
        totalQuestions: 10,
        accuracyPercent: 80,
        quartersEarned: 2,
        timeSpentMs: 60000,
        attempts: 1,
        payload: { key: "value" },
      };
      manager.recordQuizResult("mission-1", data);
      expect(manager.getState().quizResults["mission-1"]).toEqual(data);
    });

    it("emits PROGRESSION_UPDATED event", () => {
      const data = {
        completedAt: "2024-01-01",
        passed: false,
        score: 0,
        totalQuestions: 10,
        accuracyPercent: 0,
        quartersEarned: 0,
        timeSpentMs: null,
        attempts: null,
        payload: null,
      };
      manager.recordQuizResult("mission-1", data);
      expect(manager.emit).toHaveBeenCalledWith(
        ProgressionEvents.PROGRESSION_UPDATED,
        manager.getState(),
      );
    });
  });
});
