import { ScoringEvents } from "../constants/ScoringEvents";
import { ScoreManager } from "./ScoreManager";

describe("ScoreManager", () => {
  let manager: ScoreManager;

  beforeEach(() => {
    manager = new ScoreManager({ levelId: "level-1" });
  });

  describe("constructor", () => {
    it("throws when floorsTotal is not 3", () => {
      expect(
        () => new ScoreManager({ levelId: "level-1", floorsTotal: 2 }),
      ).toThrow(/MVP expects floorsTotal=3/);
    });

    it("defaults collectiblesTotal to 4", () => {
      expect(manager.getPayload().collectibles.total).toBe(4);
    });

    it("initializes three empty floors and zeroed scores", () => {
      const payload = manager.getPayload();
      expect(payload.floors).toHaveLength(3);
      expect(
        payload.floors.every(
          (f) =>
            f.errors === 0 && f.quartersEarned === 0 && f.completedAt === null,
        ),
      ).toBe(true);
      expect(payload.totalQuarters).toBe(0);
      expect(payload.totalStars).toBe(0);
      expect(payload.rating).toBe("mínimo");
    });
  });

  describe("recordFloorError", () => {
    it("increments errors for the floor and emits FLOOR_ERROR_RECORDED then SCORE_UPDATED", () => {
      manager.recordFloorError(0);
      const payload = manager.getPayload();

      expect(payload.floors[0].errors).toBe(1);
      expect(manager.emit).toHaveBeenCalledWith(
        ScoringEvents.FLOOR_ERROR_RECORDED,
        {
          floorIndex: 0,
          errors: 1,
          payload,
        },
      );
      expect(manager.emit).toHaveBeenLastCalledWith(
        ScoringEvents.SCORE_UPDATED,
        payload,
      );
    });

    it("accumulates errors across multiple calls", () => {
      manager.recordFloorError(1);
      manager.recordFloorError(1);
      manager.recordFloorError(1);
      expect(manager.getPayload().floors[1].errors).toBe(3);
    });

    it("ignores an out-of-range floorIndex", () => {
      manager.recordFloorError(99);
      expect(manager.emit).not.toHaveBeenCalled();
    });

    it("is a no-op once the floor is completed", () => {
      manager.completeFloor(0);
      (manager.emit as jest.Mock).mockClear();
      manager.recordFloorError(0);
      expect(manager.emit).not.toHaveBeenCalled();
      expect(manager.getPayload().floors[0].errors).toBe(0);
    });
  });

  describe("completeFloor", () => {
    it.each([
      [0, 4],
      [1, 3],
      [2, 2],
      [3, 1],
      [10, 1],
    ])("awards %i errors -> %i quarters", (errors, expectedQuarters) => {
      for (let i = 0; i < errors; i++) manager.recordFloorError(0);
      manager.completeFloor(0);
      expect(manager.getPayload().floors[0].quartersEarned).toBe(
        expectedQuarters,
      );
    });

    it("sets completedAt and emits FLOOR_COMPLETED then SCORE_UPDATED", () => {
      manager.recordFloorError(0);
      manager.completeFloor(0);
      const payload = manager.getPayload();

      expect(payload.floors[0].completedAt).not.toBeNull();
      expect(manager.emit).toHaveBeenCalledWith(ScoringEvents.FLOOR_COMPLETED, {
        floorIndex: 0,
        errors: 1,
        quartersEarned: 3,
        payload,
      });
      expect(manager.emit).toHaveBeenLastCalledWith(
        ScoringEvents.SCORE_UPDATED,
        payload,
      );
    });

    it("ignores an out-of-range floorIndex", () => {
      manager.completeFloor(99);
      expect(manager.emit).not.toHaveBeenCalled();
    });

    it("is idempotent once completed", () => {
      manager.completeFloor(0);
      const payloadAfterFirst = manager.getPayload();
      (manager.emit as jest.Mock).mockClear();

      manager.recordFloorError(0);
      manager.completeFloor(0);

      expect(manager.emit).not.toHaveBeenCalled();
      expect(manager.getPayload()).toEqual(payloadAfterFirst);
    });
  });

  describe("recordCollectible", () => {
    it("increments interactionsCount and sets quartersEarned to the running count", () => {
      manager.recordCollectible("c1", "book");
      expect(manager.getPayload().collectibles).toMatchObject({
        interactionsCount: 1,
        quartersEarned: 1,
      });

      manager.recordCollectible("c2", "book");
      expect(manager.getPayload().collectibles).toMatchObject({
        interactionsCount: 2,
        quartersEarned: 2,
      });
    });

    it("emits COLLECTIBLE_USED then SCORE_UPDATED", () => {
      manager.recordCollectible("c1", "book");
      const payload = manager.getPayload();
      expect(manager.emit).toHaveBeenCalledWith(
        ScoringEvents.COLLECTIBLE_USED,
        {
          interactionsCount: 1,
          payload,
        },
      );
      expect(manager.emit).toHaveBeenLastCalledWith(
        ScoringEvents.SCORE_UPDATED,
        payload,
      );
    });

    it("ignores a duplicate collectibleId + collectibleType pair", () => {
      manager.recordCollectible("c1", "book");
      (manager.emit as jest.Mock).mockClear();
      manager.recordCollectible("c1", "book");
      expect(manager.emit).not.toHaveBeenCalled();
      expect(manager.getPayload().collectibles.interactionsCount).toBe(1);
    });

    it("treats the same id with a different type as a new interaction", () => {
      manager.recordCollectible("c1", "book");
      manager.recordCollectible("c1", "photo");
      expect(manager.getPayload().collectibles.interactionsCount).toBe(2);
    });

    it("ignores an empty collectibleId", () => {
      manager.recordCollectible("", "book");
      expect(manager.emit).not.toHaveBeenCalled();
      expect(manager.getPayload().collectibles.interactionsCount).toBe(0);
    });

    it("stops recording once the total is reached", () => {
      manager = new ScoreManager({ levelId: "level-1", collectiblesTotal: 1 });
      manager.recordCollectible("c1", "book");
      (manager.emit as jest.Mock).mockClear();
      manager.recordCollectible("c2", "book");
      expect(manager.emit).not.toHaveBeenCalled();
      expect(manager.getPayload().collectibles.interactionsCount).toBe(1);
    });
  });

  describe("recordQuizResult", () => {
    it.each([
      [10, 10, 100, 4],
      [7, 10, 70, 2],
      [0, 10, 0, 0],
      [10, 0, 0, 0],
    ])("correct=%i total=%i -> accuracy=%i%% quarters=%i", (correct, total, accuracy, quarters) => {
      manager.recordQuizResult(correct, total);
      expect(manager.getPayload().quiz).toMatchObject({
        correctAnswers: total === 0 ? 0 : correct,
        totalQuestions: total,
        accuracyPercent: accuracy,
        quartersEarned: quarters,
      });
    });

    it("clamps correctAnswers to totalQuestions", () => {
      manager.recordQuizResult(15, 10);
      expect(manager.getPayload().quiz.correctAnswers).toBe(10);
    });

    it("clamps negative correctAnswers to 0", () => {
      manager.recordQuizResult(-5, 10);
      expect(manager.getPayload().quiz.correctAnswers).toBe(0);
    });

    it("emits QUIZ_COMPLETED then SCORE_UPDATED", () => {
      manager.recordQuizResult(8, 10);
      const payload = manager.getPayload();
      expect(manager.emit).toHaveBeenCalledWith(ScoringEvents.QUIZ_COMPLETED, {
        correctAnswers: 8,
        totalQuestions: 10,
        accuracyPercent: 80,
        quartersEarned: 3,
        payload,
      });
      expect(manager.emit).toHaveBeenLastCalledWith(
        ScoringEvents.SCORE_UPDATED,
        payload,
      );
    });
  });

  describe("recordIntermediateQuizResult", () => {
    it("increments quartersNet by +1 on pass", () => {
      manager.recordIntermediateQuizResult("info-1", true);
      expect(manager.getPayload().intermediateQuizzes).toEqual({
        total: 1,
        passed: 1,
        quartersNet: 1,
      });
    });

    it("decrements quartersNet by -1 on failure", () => {
      manager.recordIntermediateQuizResult("info-1", false);
      expect(manager.getPayload().intermediateQuizzes).toEqual({
        total: 1,
        passed: 0,
        quartersNet: -1,
      });
    });

    it("accumulates total and net across multiple calls", () => {
      manager.recordIntermediateQuizResult("info-1", true);
      manager.recordIntermediateQuizResult("info-2", false);
      manager.recordIntermediateQuizResult("info-3", true);
      expect(manager.getPayload().intermediateQuizzes).toEqual({
        total: 3,
        passed: 2,
        quartersNet: 1,
      });
    });

    it("emits INTERMEDIATE_QUIZ_COMPLETED then SCORE_UPDATED", () => {
      manager.recordIntermediateQuizResult("info-1", true);
      const payload = manager.getPayload();
      expect(manager.emit).toHaveBeenCalledWith(
        ScoringEvents.INTERMEDIATE_QUIZ_COMPLETED,
        {
          infoKey: "info-1",
          passed: true,
          payload,
        },
      );
      expect(manager.emit).toHaveBeenLastCalledWith(
        ScoringEvents.SCORE_UPDATED,
        payload,
      );
    });
  });

  describe("getPayload totals and rating", () => {
    it("sums quarters from floors, collectibles, quiz and intermediate quizzes", () => {
      manager.completeFloor(0); // +4
      manager.completeFloor(1); // +4
      manager.recordCollectible("c1", "book"); // +1
      manager.recordQuizResult(10, 10); // +4
      manager.recordIntermediateQuizResult("info-1", true); // +1

      expect(manager.getPayload().totalQuarters).toBe(14);
      expect(manager.getPayload().totalStars).toBe(3.5);
    });

    it("never goes below zero even with net-negative intermediate quizzes", () => {
      manager.recordIntermediateQuizResult("info-1", false);
      manager.recordIntermediateQuizResult("info-2", false);
      expect(manager.getPayload().totalQuarters).toBe(0);
    });

    it.each([
      [20, "perfeito"],
      [16, "ótimo"],
      [12, "bom"],
      [8, "regular"],
      [0, "mínimo"],
    ])("rates totalQuarters=%i as %s", (quarters, rating) => {
      // 3 floors max 4 quarters each = 12; use quiz (4) + collectibles (4) + floors to reach targets.
      manager = new ScoreManager({ levelId: "level-1" });
      let remaining = quarters;
      for (let i = 0; i < 3 && remaining > 0; i++) {
        manager.completeFloor(i);
        remaining -= 4;
      }
      if (remaining > 0) {
        manager.recordQuizResult(10, 10);
        remaining -= 4;
      }
      for (let i = 0; remaining > 0 && i < 4; i++) {
        manager.recordCollectible(`c${i}`, "book");
        remaining -= 1;
      }
      expect(manager.getPayload().rating).toBe(rating);
    });
  });

  describe("getLevelId", () => {
    it("returns the configured levelId", () => {
      expect(manager.getLevelId()).toBe("level-1");
    });
  });

  describe("event ordering", () => {
    it("records a level-started event at construction", () => {
      expect(manager.getPayload().events).toEqual([
        { type: "level-started", occurredAt: expect.any(String) },
      ]);
    });

    it("appends events in the order actions occur", () => {
      manager.recordFloorError(0);
      manager.completeFloor(0);
      manager.recordCollectible("c1", "book");

      const types = manager.getPayload().events.map((e) => e.type);
      expect(types).toEqual([
        "level-started",
        "floor-error",
        "floor-completed",
        "collectible",
      ]);
    });
  });
});
