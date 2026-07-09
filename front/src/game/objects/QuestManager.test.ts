import { QuestManager, QuestStatus } from "./QuestManager";

describe("QuestManager", () => {
  const QUESTS = [
    { id: "mission-1", requiredInfos: ["info-a", "info-b"] },
    { id: "mission-2", requiredInfos: ["info-c"] },
  ];

  let manager: QuestManager;
  let emit: jest.Mock;

  beforeEach(() => {
    manager = new QuestManager(QUESTS);
    emit = manager.emit as unknown as jest.Mock;
  });

  describe("constructor", () => {
    it("initializes every quest as IDLE with no collected info", () => {
      expect(manager.getStatus("mission-1")).toBe(QuestStatus.IDLE);
      expect(manager.getStatus("mission-2")).toBe(QuestStatus.IDLE);
      expect(manager.getCollectedInfos("mission-1")).toEqual([]);
    });

    it("defaults an unknown missionId to IDLE", () => {
      expect(manager.getStatus("unknown")).toBe(QuestStatus.IDLE);
    });
  });

  describe("setStatus", () => {
    it("emits status-changed with old and new status", () => {
      manager.setStatus("mission-1", QuestStatus.INTRO_DIALOGUE);
      expect(emit).toHaveBeenCalledWith("status-changed", {
        missionId: "mission-1",
        status: QuestStatus.INTRO_DIALOGUE,
        oldStatus: QuestStatus.IDLE,
      });
    });

    it("does not emit when the status is unchanged", () => {
      manager.setStatus("mission-1", QuestStatus.IDLE);
      expect(emit).not.toHaveBeenCalled();
    });

    it("is a no-op for an unknown missionId", () => {
      manager.setStatus("unknown", QuestStatus.COLLECTING);
      expect(emit).not.toHaveBeenCalled();
    });

    it("auto-advances COLLECTING -> READY_FOR_QUIZ when all info is already collected", () => {
      manager.collectInfo("info-c");
      emit.mockClear();

      manager.setStatus("mission-2", QuestStatus.COLLECTING);

      expect(emit).toHaveBeenNthCalledWith(1, "status-changed", {
        missionId: "mission-2",
        status: QuestStatus.COLLECTING,
        oldStatus: QuestStatus.IDLE,
      });
      expect(emit).toHaveBeenNthCalledWith(2, "status-changed", {
        missionId: "mission-2",
        status: QuestStatus.READY_FOR_QUIZ,
        oldStatus: QuestStatus.COLLECTING,
      });
      expect(manager.getStatus("mission-2")).toBe(QuestStatus.READY_FOR_QUIZ);
    });

    it("does not auto-advance to READY_FOR_QUIZ when info is still missing", () => {
      manager.setStatus("mission-1", QuestStatus.COLLECTING);
      expect(manager.getStatus("mission-1")).toBe(QuestStatus.COLLECTING);
    });
  });

  describe("collectInfo", () => {
    it("emits info-collected and returns true for a required info on an IDLE quest", () => {
      const result = manager.collectInfo("info-a");

      expect(result).toBe(true);
      expect(emit).toHaveBeenCalledWith("info-collected", {
        missionId: "mission-1",
        infoKey: "info-a",
      });
      expect(manager.hasInfo("mission-1", "info-a")).toBe(true);
    });

    it("returns false and emits nothing for an infoKey no quest requires", () => {
      const result = manager.collectInfo("info-unrelated");

      expect(result).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });

    it("returns false when the info was already collected", () => {
      manager.collectInfo("info-a");
      emit.mockClear();

      const result = manager.collectInfo("info-a");

      expect(result).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });

    it("ignores quests that are not IDLE or COLLECTING", () => {
      manager.setStatus("mission-1", QuestStatus.COLLECTING);
      manager.setStatus("mission-1", QuestStatus.READY_FOR_QUIZ);
      emit.mockClear();

      const result = manager.collectInfo("info-a");
      expect(result).toBe(false);
      expect(emit).not.toHaveBeenCalled();
    });

    it("applies a single infoKey to every matching quest", () => {
      const shared = new QuestManager([
        { id: "mission-a", requiredInfos: ["shared-info"] },
        { id: "mission-b", requiredInfos: ["shared-info"] },
      ]);
      const sharedEmit = shared.emit as unknown as jest.Mock;

      const result = shared.collectInfo("shared-info");

      expect(result).toBe(true);
      const infoCollectedCalls = sharedEmit.mock.calls.filter(
        ([event]) => event === "info-collected",
      );
      expect(infoCollectedCalls).toHaveLength(2);
      expect(shared.hasInfo("mission-a", "shared-info")).toBe(true);
      expect(shared.hasInfo("mission-b", "shared-info")).toBe(true);
    });

    it("auto-advances a COLLECTING quest to READY_FOR_QUIZ once all info is collected", () => {
      manager.setStatus("mission-1", QuestStatus.COLLECTING);
      emit.mockClear();

      manager.collectInfo("info-a");
      expect(emit).not.toHaveBeenCalledWith(
        "status-changed",
        expect.objectContaining({ status: QuestStatus.READY_FOR_QUIZ }),
      );

      manager.collectInfo("info-b");
      expect(emit).toHaveBeenCalledWith("status-changed", {
        missionId: "mission-1",
        status: QuestStatus.READY_FOR_QUIZ,
        oldStatus: QuestStatus.COLLECTING,
      });
      expect(manager.getStatus("mission-1")).toBe(QuestStatus.READY_FOR_QUIZ);
    });

    it("does not auto-advance an IDLE quest even once all info is collected", () => {
      manager.collectInfo("info-c");
      expect(manager.getStatus("mission-2")).toBe(QuestStatus.IDLE);
    });
  });

  describe("progress getters", () => {
    it("reports required and collected counts per mission", () => {
      manager.collectInfo("info-a");
      expect(manager.getRequiredCount("mission-1")).toBe(2);
      expect(manager.getCollectedCount("mission-1")).toBe(1);
      expect(manager.getRequiredInfos("mission-1")).toEqual([
        "info-a",
        "info-b",
      ]);
    });

    it("excludes IDLE quests from totals", () => {
      expect(manager.getTotalRequiredCount()).toBe(0);
      expect(manager.getTotalCollectedCount()).toBe(0);
    });

    it("includes non-IDLE quests in totals", () => {
      manager.setStatus("mission-1", QuestStatus.COLLECTING);
      manager.collectInfo("info-a");
      expect(manager.getTotalRequiredCount()).toBe(2);
      expect(manager.getTotalCollectedCount()).toBe(1);
    });

    it("counts completed missions", () => {
      expect(manager.getTotalCompletedMissions()).toBe(0);
      manager.setStatus("mission-1", QuestStatus.COMPLETED);
      expect(manager.getTotalCompletedMissions()).toBe(1);
    });
  });

  describe("hasCollectedAll", () => {
    it("is false until every required info is collected", () => {
      manager.collectInfo("info-a");
      expect(manager.hasCollectedAll("mission-1")).toBe(false);
      manager.collectInfo("info-b");
      expect(manager.hasCollectedAll("mission-1")).toBe(true);
    });

    it("is false for an unknown missionId", () => {
      expect(manager.hasCollectedAll("unknown")).toBe(false);
    });
  });

  describe("pending result lines", () => {
    it("stores and retrieves pending result lines", () => {
      manager.setPendingResult("mission-1", ["line-1", "line-2"]);
      expect(manager.getPendingResult("mission-1")).toEqual([
        "line-1",
        "line-2",
      ]);
    });

    it("clears pending result lines when set to null", () => {
      manager.setPendingResult("mission-1", ["line-1"]);
      manager.setPendingResult("mission-1", null);
      expect(manager.getPendingResult("mission-1")).toBeNull();
    });

    it("clearPendingResult removes stored lines", () => {
      manager.setPendingResult("mission-1", ["line-1"]);
      manager.clearPendingResult("mission-1");
      expect(manager.getPendingResult("mission-1")).toBeNull();
    });

    it("returns a defensive copy", () => {
      manager.setPendingResult("mission-1", ["line-1"]);
      const lines = manager.getPendingResult("mission-1");
      lines?.push("mutated");
      expect(manager.getPendingResult("mission-1")).toEqual(["line-1"]);
    });
  });

  describe("intermediate quizzes", () => {
    it("marks the owning quest's infoKey as done and emits intermediate-quiz-done", () => {
      manager.markIntermediateQuizDone("info-a");

      expect(emit).toHaveBeenCalledWith("intermediate-quiz-done", {
        infoKey: "info-a",
      });
      expect(manager.isIntermediateQuizDone("info-a")).toBe(true);
    });

    it("only marks the first quest that requires the infoKey", () => {
      const shared = new QuestManager([
        { id: "mission-a", requiredInfos: ["shared-info"] },
        { id: "mission-b", requiredInfos: ["shared-info"] },
      ]);
      const sharedEmit = shared.emit as unknown as jest.Mock;
      shared.markIntermediateQuizDone("shared-info");

      const doneCalls = sharedEmit.mock.calls.filter(
        ([event]) => event === "intermediate-quiz-done",
      );
      expect(doneCalls).toHaveLength(1);
    });

    it("is false for an infoKey that was never marked done", () => {
      expect(manager.isIntermediateQuizDone("info-a")).toBe(false);
    });
  });

  describe("reset", () => {
    it("clears collected info, intermediate quizzes, status and pending results", () => {
      manager.collectInfo("info-a");
      manager.markIntermediateQuizDone("info-a");
      manager.setPendingResult("mission-1", ["line-1"]);
      manager.setStatus("mission-1", QuestStatus.COLLECTING);

      manager.reset("mission-1");

      expect(manager.getStatus("mission-1")).toBe(QuestStatus.IDLE);
      expect(manager.getCollectedInfos("mission-1")).toEqual([]);
      expect(manager.isIntermediateQuizDone("info-a")).toBe(false);
      expect(manager.getPendingResult("mission-1")).toBeNull();
    });

    it("is a no-op for an unknown missionId", () => {
      expect(() => manager.reset("unknown")).not.toThrow();
    });
  });
});
