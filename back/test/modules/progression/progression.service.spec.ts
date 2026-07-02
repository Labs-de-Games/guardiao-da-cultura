import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { UpdateProgressionDto } from "../../../src/modules/progression/dto/update-progression.dto";
import { ProgressionService } from "../../../src/modules/progression/progression.service";
import { UserProgress } from "../../../src/modules/progression/user-progress.entity";

type QueryBuilderMock = {
  insert: jest.Mock<QueryBuilderMock, []>;
  into: jest.Mock<QueryBuilderMock, [unknown]>;
  values: jest.Mock<QueryBuilderMock, [unknown]>;
  orIgnore: jest.Mock<QueryBuilderMock, []>;
  execute: jest.Mock<Promise<unknown>, []>;
};

type ProgressRepoMock = {
  findOne: jest.Mock<Promise<unknown>, [unknown]>;
  findOneOrFail: jest.Mock<Promise<unknown>, [unknown]>;
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

const BASE_PROGRESS = {
  id: "p1",
  userId: "test-user",
  completedLevels: "{}",
  clues: "{}",
  quizResults: "{}",
  totalStars: 0,
  currentLevel: 1,
};

describe("ProgressionService", () => {
  let service: ProgressionService;
  let repo: ProgressRepoMock;

  beforeEach(async () => {
    const queryBuilder = createQueryBuilderMock();
    repo = {
      findOne: jest.fn(async (_options: unknown) => null),
      findOneOrFail: jest.fn(async (_options: unknown) => null),
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

  describe("findByUserId", () => {
    it("returns null when no record exists", async () => {
      const result = await service.findByUserId("nonexistent");
      expect(result).toBeNull();
    });

    it("returns the record when found", async () => {
      repo.findOne.mockResolvedValue(BASE_PROGRESS);

      const result = await service.findByUserId("test-user");
      expect(result).toEqual(BASE_PROGRESS);
    });
  });

  describe("upsertProgress", () => {
    beforeEach(() => {
      repo.findOne.mockResolvedValue(BASE_PROGRESS);
      repo.findOneOrFail.mockResolvedValue(BASE_PROGRESS);
    });

    it("partial update — only currentLevel provided", async () => {
      const dto: UpdateProgressionDto = { currentLevel: 5 };
      await service.upsertProgress("test-user", dto);

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.currentLevel).toBe(5);
      expect(updatePayload.totalStars).toBeUndefined();
      expect(updatePayload.completedLevels).toBeUndefined();
    });

    it("partial update — only totalStars provided", async () => {
      const dto: UpdateProgressionDto = { totalStars: 42 };
      await service.upsertProgress("test-user", dto);

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.totalStars).toBe(42);
      expect(updatePayload.currentLevel).toBeUndefined();
    });

    it("completedLevels provided as object → stored as JSON string", async () => {
      const completedLevels = { level_01: { stars: 3, score: 100 } };
      const dto: UpdateProgressionDto = { completedLevels };
      await service.upsertProgress("test-user", dto);

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.completedLevels).toBe(
        JSON.stringify(completedLevels),
      );
    });

    it("clues provided as object → stored as JSON string", async () => {
      const clues = { clue_01: { usedAt: new Date().toISOString() } };
      const dto: UpdateProgressionDto = { clues };
      await service.upsertProgress("test-user", dto);

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.clues).toBe(JSON.stringify(clues));
    });

    it("quizResults provided as object → stored as JSON string", async () => {
      const quizResults = { mission_01: { passed: true, score: 3 } };
      const dto: UpdateProgressionDto = { quizResults };
      await service.upsertProgress("test-user", dto);

      expect(repo.update).toHaveBeenCalledTimes(1);
      const updatePayload = repo.update.mock.calls[0][1] as any;
      expect(updatePayload.quizResults).toBe(JSON.stringify(quizResults));
    });

    it("no existing record → findOrCreate inserts before updating", async () => {
      const dto: UpdateProgressionDto = { currentLevel: 2 };
      await service.upsertProgress("new-user", dto);

      expect(repo.createQueryBuilder).toHaveBeenCalled();
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { userId: "new-user" },
      });
      expect(repo.update).toHaveBeenCalledTimes(1);
    });
  });
});
