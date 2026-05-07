import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ProgressionService } from "../../../src/modules/progression/progression.service";
import { UserProgress } from "../../../src/modules/progression/user-progress.entity";
import { GameEventType } from "../../../src/shared/events/game-events";

describe("ProgressionService", () => {
  let service: ProgressionService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProgressionService,
        {
          provide: getRepositoryToken(UserProgress),
          useValue: repo,
        },
      ],
    }).compile();

    service = moduleRef.get(ProgressionService);
  });

  it("stores quiz result by missionId on quiz.completed", async () => {
    const userId = "9a8d8071-4d3c-4d0b-a8a6-d41079831ae1";
    const progress = {
      id: "p1",
      userId,
      completedLevels: "{}",
      clues: "{}",
      quizResults: JSON.stringify({ other_mission: { passed: true } }),
      totalStars: 0,
      currentLevel: 1,
    };

    repo.findOne.mockResolvedValue(progress);

    const now = new Date("2026-05-06T00:00:00.000Z");
    await service.handleQuizCompleted({
      userId,
      type: GameEventType.QUIZ_COMPLETED,
      timestamp: now,
      metadata: {
        missionId: "mission_1",
        score: 3,
        totalQuestions: 4,
        accuracyPercent: 75,
        quartersEarned: 3,
        passed: true,
      },
    });

    expect(repo.update).toHaveBeenCalledTimes(1);
    expect(repo.update.mock.calls[0][0]).toBe("p1");
    const updatePayload = repo.update.mock.calls[0][1];
    const stored = JSON.parse(updatePayload.quizResults);
    expect(stored.other_mission.passed).toBe(true);
    expect(stored.mission_1.passed).toBe(true);
    expect(stored.mission_1.score).toBe(3);
    expect(stored.mission_1.totalQuestions).toBe(4);
    expect(stored.mission_1.accuracyPercent).toBe(75);
    expect(stored.mission_1.quartersEarned).toBe(3);
    expect(new Date(stored.mission_1.completedAt).toISOString()).toBe(
      now.toISOString(),
    );
  });

  it("does nothing when userId is missing", async () => {
    await service.handleQuizFailed({
      type: GameEventType.QUIZ_FAILED,
      timestamp: new Date(),
      metadata: {
        missionId: "mission_1",
        score: 1,
        totalQuestions: 4,
        accuracyPercent: 25,
        quartersEarned: 1,
        passed: false,
      },
    });

    expect(repo.findOne).not.toHaveBeenCalled();
    expect(repo.update).not.toHaveBeenCalled();
  });
});
