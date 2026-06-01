import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ProgressionService } from "../../../src/modules/progression/progression.service";
import { UserProgress } from "../../../src/modules/progression/user-progress.entity";
import { GameEventType } from "../../../src/shared/events/game-events";

type QueryBuilderMock = {
  insert: jest.Mock<QueryBuilderMock, []>;
  into: jest.Mock<QueryBuilderMock, [unknown]>;
  values: jest.Mock<QueryBuilderMock, [unknown]>;
  orIgnore: jest.Mock<QueryBuilderMock, []>;
  execute: jest.Mock<Promise<unknown>, []>;
};

type ProgressRepoMock = {
  findOne: jest.Mock<Promise<unknown>, [unknown]>;
  create: jest.Mock<unknown, [unknown]>;
  save: jest.Mock<Promise<unknown>, [unknown]>;
  update: jest.Mock<Promise<{ affected: number }>, [unknown, unknown]>;
  createQueryBuilder: jest.Mock<QueryBuilderMock, []>;
};

function createQueryBuilderMock(): QueryBuilderMock {
  const builder = {} as QueryBuilderMock;
  builder.insert = jest.fn(() => builder);
  builder.into = jest.fn((_target: unknown) => builder);
  builder.values = jest.fn((_values: unknown) => builder);
  builder.orIgnore = jest.fn(() => builder);
  builder.execute = jest.fn(async () => ({
    identifiers: [],
    generatedMaps: [],
    raw: [],
  }));
  return builder;
}

describe("ProgressionService", () => {
  let service: ProgressionService;
  let repo: ProgressRepoMock;

  beforeEach(async () => {
    const queryBuilder = createQueryBuilderMock();
    repo = {
      findOne: jest.fn(async (_options: unknown) => null),
      create: jest.fn((dto: unknown) => dto),
      save: jest.fn(async (entity: unknown) => entity),
      update: jest.fn(async (_id: unknown, _data: unknown) => ({
        affected: 1,
      })),
      createQueryBuilder: jest.fn(() => queryBuilder),
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

    repo.findOne.mockImplementation(async () => progress);

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
    const updatePayload = repo.update.mock.calls[0][1] as any;
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

  describe("handleLevelCompleted", () => {
    it("advances currentLevel when levelNumber is provided", async () => {
      const userId = "user_1";
      const progress = {
        id: "p1",
        userId,
        completedLevels: "{}",
        clues: "{}",
        quizResults: "{}",
        totalStars: 0,
        currentLevel: 1,
      };

      repo.findOne.mockImplementation(async () => progress);

      await service.handleLevelCompleted({
        userId,
        type: GameEventType.LEVEL_COMPLETED,
        timestamp: new Date(),
        metadata: {
          levelId: "level_01",
          levelNumber: 1,
        },
      });

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.currentLevel).toBe(2);
    });

    it("does not increment currentLevel when replaying a lower level", async () => {
      const userId = "user_1";
      const progress = {
        id: "p1",
        userId,
        completedLevels: "{}",
        clues: "{}",
        quizResults: "{}",
        totalStars: 0,
        currentLevel: 4,
      };

      repo.findOne.mockImplementation(async () => progress);

      await service.handleLevelCompleted({
        userId,
        type: GameEventType.LEVEL_COMPLETED,
        timestamp: new Date(),
        metadata: {
          levelId: "level_01",
          levelNumber: 1,
        },
      });

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.currentLevel).toBe(4);
    });

    it("does not change currentLevel when levelNumber is missing", async () => {
      const userId = "user_1";
      const progress = {
        id: "p1",
        userId,
        completedLevels: "{}",
        clues: "{}",
        quizResults: "{}",
        totalStars: 0,
        currentLevel: 3,
      };

      repo.findOne.mockImplementation(async () => progress);

      await service.handleLevelCompleted({
        userId,
        type: GameEventType.LEVEL_COMPLETED,
        timestamp: new Date(),
        metadata: {
          levelId: "level_01",
        },
      });

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.currentLevel).toBe(3);
    });

    it("increments totalStars and stores highest stars when replaying with better stars", async () => {
      const userId = "user_1";
      const progress = {
        id: "p1",
        userId,
        completedLevels: JSON.stringify({
          level_01: { completedAt: new Date(), score: 100, stars: 1 },
        }),
        clues: "{}",
        quizResults: "{}",
        totalStars: 1,
        currentLevel: 2,
      };

      repo.findOne.mockImplementation(async () => progress);

      await service.handleLevelCompleted({
        userId,
        type: GameEventType.LEVEL_COMPLETED,
        timestamp: new Date(),
        metadata: {
          levelId: "level_01",
          levelNumber: 1,
          score: 150,
          stars: 3,
        },
      });

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.totalStars).toBe(3);
      const stored = JSON.parse(updatePayload.completedLevels);
      expect(stored.level_01.stars).toBe(3);
      expect(stored.level_01.score).toBe(150);
    });

    it("does not increment totalStars when replaying with lower or equal stars", async () => {
      const userId = "user_1";
      const progress = {
        id: "p1",
        userId,
        completedLevels: JSON.stringify({
          level_01: { completedAt: new Date(), score: 200, stars: 3 },
        }),
        clues: "{}",
        quizResults: "{}",
        totalStars: 3,
        currentLevel: 2,
      };

      repo.findOne.mockImplementation(async () => progress);

      await service.handleLevelCompleted({
        userId,
        type: GameEventType.LEVEL_COMPLETED,
        timestamp: new Date(),
        metadata: {
          levelId: "level_01",
          levelNumber: 1,
          score: 250,
          stars: 2,
        },
      });

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.totalStars).toBe(3);
      const stored = JSON.parse(updatePayload.completedLevels);
      expect(stored.level_01.stars).toBe(3);
      expect(stored.level_01.score).toBe(250);
    });
  });
});
