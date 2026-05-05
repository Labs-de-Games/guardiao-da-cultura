import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AppModule } from "../src/app.module";
import { DatabaseModule } from "../src/core/database/database.module";
import { GameEvent } from "../src/modules/analytics/game-event.entity";
import { Badge } from "../src/modules/badges/badge.entity";
import { UserBadge } from "../src/modules/badges/user-badge.entity";
import { UserProgress } from "../src/modules/progression/user-progress.entity";
import { User } from "../src/modules/users/user.entity";

class MockDatabaseModule {}

const mockRepository = {
  find: async () => [],
  findOne: async () => null,
  create: (dto: unknown) => dto,
  save: async (entity: unknown) => entity,
  update: async () => ({ affected: 1 }),
};

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule({ module: MockDatabaseModule })
      .overrideProvider(getRepositoryToken(User))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UserProgress))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(GameEvent))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(Badge))
      .useValue(mockRepository)
      .overrideProvider(getRepositoryToken(UserBadge))
      .useValue(mockRepository)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.listen(0);
  });

  it("/api/v1/health (GET)", async () => {
    const url = await app.getUrl();
    const response = await fetch(`${url}/api/v1/health`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  afterAll(async () => {
    await app.close();
  });
});
