import { ScoreManager } from "./ScoreManager";

describe("ScoreManager", () => {
  let manager: ScoreManager;

  beforeEach(() => {
    manager = new ScoreManager({ levelId: "level_01" });
  });

  describe("constructor", () => {
    it("initializes with correct default values", () => {
      const payload = manager.getPayload();
      expect(payload.levelId).toBe("level_01");
      expect(payload.totalQuarters).toBe(0);
      expect(payload.totalStars).toBe(0);
      expect(payload.rating).toBe("mínimo");
      expect(payload.floors).toHaveLength(3);
      expect(payload.quiz.quartersEarned).toBe(0);
      expect(payload.intermediateQuizzes.quartersEarned).toBe(0);
    });

    it("initializes floors with quartersEarned = 0 (incomplete)", () => {
      const payload = manager.getPayload();
      payload.floors.forEach((floor) => {
        expect(floor.quartersEarned).toBe(0);
        expect(floor.completedAt).toBeNull();
      });
    });
  });

  describe("getMaxStars", () => {
    it("returns 5 for new scoring system (20 quarters max)", () => {
      expect(manager.getMaxStars()).toBe(5);
    });
  });

  describe("floor scoring", () => {
    it("0 errors = 2 quarters", () => {
      manager.completeFloor(0);
      const payload = manager.getPayload();
      expect(payload.floors[0].quartersEarned).toBe(2);
      expect(payload.floors[0].errors).toBe(0);
    });

    it("1 error = 1 quarter", () => {
      manager.recordFloorError(0);
      manager.completeFloor(0);
      const payload = manager.getPayload();
      expect(payload.floors[0].quartersEarned).toBe(1);
      expect(payload.floors[0].errors).toBe(1);
    });

    it("multiple errors = 1 quarter", () => {
      manager.recordFloorError(0);
      manager.recordFloorError(0);
      manager.recordFloorError(0);
      manager.completeFloor(0);
      const payload = manager.getPayload();
      expect(payload.floors[0].quartersEarned).toBe(1);
      expect(payload.floors[0].errors).toBe(3);
    });

    it("max floor quarters = 6 (3 floors x 2)", () => {
      manager.completeFloor(0);
      manager.completeFloor(1);
      manager.completeFloor(2);
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(6);
      expect(payload.totalStars).toBe(1.5);
    });

    it("does not double-complete floors", () => {
      manager.completeFloor(0);
      manager.completeFloor(0);
      const payload = manager.getPayload();
      expect(payload.floors[0].completedAt).not.toBeNull();
      expect(payload.totalQuarters).toBe(2);
    });

    it("ignores errors after floor completion", () => {
      manager.completeFloor(0);
      manager.recordFloorError(0);
      const payload = manager.getPayload();
      expect(payload.floors[0].errors).toBe(0);
    });
  });

  describe("quiz scoring", () => {
    it("0 correct answers = 0 quarters", () => {
      manager.recordQuizResult(0, 5);
      const payload = manager.getPayload();
      expect(payload.quiz.quartersEarned).toBe(0);
      expect(payload.quiz.correctAnswers).toBe(0);
    });

    it("1 correct answer = 1 quarter", () => {
      manager.recordQuizResult(1, 5);
      const payload = manager.getPayload();
      expect(payload.quiz.quartersEarned).toBe(1);
    });

    it("5 correct answers = 5 quarters (max)", () => {
      manager.recordQuizResult(5, 5);
      const payload = manager.getPayload();
      expect(payload.quiz.quartersEarned).toBe(5);
    });

    it("caps at 5 quarters even with more correct answers", () => {
      manager.recordQuizResult(7, 5);
      const payload = manager.getPayload();
      expect(payload.quiz.quartersEarned).toBe(5);
    });

    it("handles negative correct answers", () => {
      manager.recordQuizResult(-1, 5);
      const payload = manager.getPayload();
      expect(payload.quiz.correctAnswers).toBe(0);
      expect(payload.quiz.quartersEarned).toBe(0);
    });

    it("handles negative total questions", () => {
      manager.recordQuizResult(3, -1);
      const payload = manager.getPayload();
      expect(payload.quiz.totalQuestions).toBe(0);
      expect(payload.quiz.quartersEarned).toBe(0);
    });
  });

  describe("intermediate quiz scoring", () => {
    it("0 correct = 0 quarters", () => {
      manager.recordIntermediateQuizResult("quiz-1", 0, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.quartersEarned).toBe(0);
    });

    it("1 correct = 1 quarter", () => {
      manager.recordIntermediateQuizResult("quiz-1", 1, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.quartersEarned).toBe(1);
    });

    it("3 correct = 3 quarters (max per quiz)", () => {
      manager.recordIntermediateQuizResult("quiz-1", 3, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.quartersEarned).toBe(3);
    });

    it("caps at 3 quarters per quiz", () => {
      manager.recordIntermediateQuizResult("quiz-1", 5, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.quartersEarned).toBe(3);
    });

    it("accumulates across multiple quizzes", () => {
      manager.recordIntermediateQuizResult("quiz-1", 2, 3);
      manager.recordIntermediateQuizResult("quiz-2", 3, 3);
      manager.recordIntermediateQuizResult("quiz-3", 1, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.quartersEarned).toBe(6);
      expect(payload.intermediateQuizzes.total).toBe(3);
    });

    it("tracks passed status (>= 50% correct)", () => {
      manager.recordIntermediateQuizResult("quiz-1", 2, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.passed).toBe(1);
    });

    it("tracks failed status (< 50% correct)", () => {
      manager.recordIntermediateQuizResult("quiz-1", 1, 3);
      const payload = manager.getPayload();
      expect(payload.intermediateQuizzes.passed).toBe(0);
    });
  });

  describe("total scoring", () => {
    it("calculates total correctly with all components", () => {
      // Floor 0: 0 errors = 2 quarters
      manager.completeFloor(0);
      // Floor 1: 1 error = 1 quarter
      manager.recordFloorError(1);
      manager.completeFloor(1);
      // Floor 2: 0 errors = 2 quarters
      manager.completeFloor(2);

      // Quiz: 3/5 correct = 3 quarters
      manager.recordQuizResult(3, 5);

      // Intermediate quiz: 2/3 correct = 2 quarters
      manager.recordIntermediateQuizResult("quiz-1", 2, 3);

      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(2 + 1 + 2 + 3 + 2); // = 10
      expect(payload.totalStars).toBe(2.5);
    });
  });

  describe("rating thresholds", () => {
    it("mínimo: < 8 quarters", () => {
      // 7 quarters: 1 floor (2) + 1 quiz (5)
      manager.completeFloor(0);
      manager.recordQuizResult(5, 5);
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(7);
      expect(payload.rating).toBe("mínimo");
    });

    it("regular: >= 8 quarters", () => {
      // 8 quarters: 2 floors (4) + 1 quiz (4)
      manager.completeFloor(0);
      manager.completeFloor(1);
      manager.recordQuizResult(4, 5);
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(8);
      expect(payload.rating).toBe("regular");
    });

    it("bom: >= 12 quarters", () => {
      // 12 quarters: 2 floors (4) + 1 quiz (5) + 1 intermediate (3)
      manager.completeFloor(0);
      manager.completeFloor(1);
      manager.recordQuizResult(5, 5);
      manager.recordIntermediateQuizResult("q1", 3, 3);
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(12);
      expect(payload.rating).toBe("bom");
    });

    it("ótimo: >= 16 quarters", () => {
      // 16 quarters: 3 floors (6) + 1 quiz (5) + 1 intermediate (3) + another (2)
      manager.completeFloor(0);
      manager.completeFloor(1);
      manager.completeFloor(2);
      manager.recordQuizResult(5, 5);
      manager.recordIntermediateQuizResult("q1", 3, 3);
      manager.recordIntermediateQuizResult("q2", 2, 3);
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(16);
      expect(payload.rating).toBe("ótimo");
    });

    it("perfeito: >= 20 quarters", () => {
      // 20 quarters: 3 floors (6) + 1 quiz (5) + 3 intermediate quizzes (9)
      manager.completeFloor(0);
      manager.completeFloor(1);
      manager.completeFloor(2);
      manager.recordQuizResult(5, 5);
      manager.recordIntermediateQuizResult("q1", 3, 3);
      manager.recordIntermediateQuizResult("q2", 3, 3);
      manager.recordIntermediateQuizResult("q3", 3, 3);
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBe(20);
      expect(payload.rating).toBe("perfeito");
    });
  });

  describe("events", () => {
    it("records events in order", () => {
      manager.completeFloor(0);
      manager.recordQuizResult(3, 5);

      const payload = manager.getPayload();
      expect(payload.events).toContainEqual(
        expect.objectContaining({ type: "level-started" }),
      );
      expect(payload.events).toContainEqual(
        expect.objectContaining({ type: "floor-completed", floorIndex: 0 }),
      );
      expect(payload.events).toContainEqual(
        expect.objectContaining({ type: "quiz-completed" }),
      );
    });
  });

  describe("edge cases", () => {
    it("prevents negative total quarters", () => {
      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBeGreaterThanOrEqual(0);
    });

    it("handles zero total questions for quiz", () => {
      manager.recordQuizResult(0, 0);
      const payload = manager.getPayload();
      expect(payload.quiz.accuracyPercent).toBe(0);
      expect(payload.quiz.quartersEarned).toBe(0);
    });

    it("does not exceed theoretical max quarters", () => {
      // Max should be 20: floors (6) + quiz (5) + 3 intermediate quizzes (9)
      manager.completeFloor(0);
      manager.completeFloor(1);
      manager.completeFloor(2);
      manager.recordQuizResult(5, 5);
      manager.recordIntermediateQuizResult("q1", 3, 3);
      manager.recordIntermediateQuizResult("q2", 3, 3);
      manager.recordIntermediateQuizResult("q3", 3, 3);

      const payload = manager.getPayload();
      expect(payload.totalQuarters).toBeLessThanOrEqual(20);
    });
  });
});
