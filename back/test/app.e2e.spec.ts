import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AppModule } from "../src/app.module";
import { DatabaseModule } from "../src/database/database.module";
import { User } from "../src/users/user.entity";

class MockDatabaseModule {}

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule({ module: MockDatabaseModule })
      .overrideProvider(getRepositoryToken(User))
      .useValue({})
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
