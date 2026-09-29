import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AppModule } from "../src/app.module";
import { DatabaseModule } from "../src/core/database/database.module";
import { GameEvent } from "../src/modules/analytics/game-event.entity";
import { MagicLinkToken } from "../src/modules/auth/entities/magic-link-token.entity";
import { RefreshToken } from "../src/modules/auth/entities/refresh-token.entity";
import { Badge } from "../src/modules/badges/badge.entity";
import { UserBadge } from "../src/modules/badges/user-badge.entity";
import { CampaignLink } from "../src/modules/campaign-links/campaign-link.entity";
import { UserConsent } from "../src/modules/consent/user-consent.entity";
import { UserProgress } from "../src/modules/progression/user-progress.entity";
import { UserCollectible } from "../src/modules/scoring/user-collectible.entity";
import { UserScore } from "../src/modules/scoring/user-score.entity";
import { UserInterested } from "../src/modules/user-interested/user-interested.entity";
import { User } from "../src/modules/users/user.entity";

class MockDatabaseModule {}

describe("AppController (e2e)", () => {
  let app: INestApplication;

  const repo = {
    find: async () => [],
    findOne: async () => null,
    create: (dto: unknown) => dto,
    createQueryBuilder: () => ({
      insert: () => ({
        into: () => ({
          values: () => ({
            orIgnore: () => ({
              execute: async () => ({ identifiers: [] }),
            }),
          }),
        }),
      }),
    }),
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
      .overrideProvider(getRepositoryToken(UserConsent))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(GameEvent))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(Badge))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(UserBadge))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(MagicLinkToken))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(RefreshToken))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(UserScore))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(UserCollectible))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(UserInterested))
      .useValue(repo)
      .overrideProvider(getRepositoryToken(CampaignLink))
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

  afterAll(async () => {
    await app.close();
  });
});
