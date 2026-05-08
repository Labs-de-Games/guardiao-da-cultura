import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test } from "@nestjs/testing";
import { GameService } from "../../../src/modules/game/game.service";

describe("GameService", () => {
  let service: GameService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GameService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get<GameService>(GameService);
  });

  describe("processEvent", () => {
    it("should accept valid quiz.completed event", async () => {
      const validPayload = {
        type: "quiz.completed",
        timestamp: new Date(),
        metadata: {
          missionId: "mission_curator",
          score: 3,
          totalQuestions: 4,
          accuracyPercent: 75,
          quartersEarned: 3,
          passed: true,
        },
      };

      await expect(service.processEvent(validPayload)).resolves.toBeUndefined();
    });

    it("should accept valid quiz.failed event", async () => {
      const validPayload = {
        type: "quiz.failed",
        timestamp: new Date(),
        metadata: {
          missionId: "mission_curator",
          score: 1,
          totalQuestions: 4,
          accuracyPercent: 25,
          quartersEarned: 1,
          passed: false,
        },
      };

      await expect(service.processEvent(validPayload)).resolves.toBeUndefined();
    });

    it("should reject quiz event with missing missionId", async () => {
      const invalidPayload = {
        type: "quiz.completed",
        timestamp: new Date(),
        metadata: {
          score: 3,
          totalQuestions: 4,
          accuracyPercent: 75,
          quartersEarned: 3,
          passed: true,
        },
      };

      await expect(
        service.processEvent(invalidPayload as unknown as GameEventPayload),
      ).rejects.toThrow("Invalid quiz event payload");
    });

    it("should reject quiz event with negative score", async () => {
      const invalidPayload = {
        type: "quiz.completed",
        timestamp: new Date(),
        metadata: {
          missionId: "mission_curator",
          score: -1,
          totalQuestions: 4,
          accuracyPercent: 75,
          quartersEarned: 3,
          passed: true,
        },
      };

      await expect(
        service.processEvent(invalidPayload as unknown as GameEventPayload),
      ).rejects.toThrow("Invalid quiz event payload");
    });

    it("should accept non-quiz events without validation", async () => {
      const nonQuizPayload = {
        type: "level.completed",
        timestamp: new Date(),
        metadata: {
          levelId: "level_01",
        },
      };

      await expect(
        service.processEvent(nonQuizPayload),
      ).resolves.toBeUndefined();
    });
  });
});
