import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { QueryFailedError } from "typeorm";
import { AppModule } from "../src/app.module";
import { DatabaseModule } from "../src/core/database/database.module";
import { GameEvent } from "../src/modules/analytics/game-event.entity";
import { Badge } from "../src/modules/badges/badge.entity";
import { UserBadge } from "../src/modules/badges/user-badge.entity";
import { UserProgress } from "../src/modules/progression/user-progress.entity";
import { User } from "../src/modules/users/user.entity";

class MockDatabaseModule {}

describe("AppController (e2e)", () => {
  let app: INestApplication;

  const repo = {
    find: async () => [],
    findOne: async () => null,
    create: (dto: unknown) => dto,
    save: async (entity: unknown) => entity,
    update: async () => ({ affected: 1 }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule({ module: MockDatabaseModule })
      .overrideProvider(getRepositoryToken(User))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(UserProgress))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(GameEvent))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(Badge))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(UserBadge))
      .useValue(repo)
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

  it("/api/v1/users/register returns 409 on duplicate email", async () => {
    const url = await app.getUrl();

    const originalSave = repo.save;

    // Simulate Postgres unique violation.
    repo.save = async () => {
      throw new QueryFailedError("", [], { code: "23505" });
    };

    const response = await fetch(`${url}/api/v1/users/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        username: "u1",
        email: "test@example.com",
        password: "pw",
      }),
    });

    expect(response.status).toBe(409);

    repo.save = originalSave;
  });

  afterAll(async () => {
    await app.close();
  });
});
