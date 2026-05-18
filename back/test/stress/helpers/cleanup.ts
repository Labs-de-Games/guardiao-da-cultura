import "reflect-metadata";

import { DataSource, Like } from "typeorm";
import { GameEvent } from "../../../src/modules/analytics/game-event.entity";
import { MagicLinkToken } from "../../../src/modules/auth/entities/magic-link-token.entity";
import { RefreshToken } from "../../../src/modules/auth/entities/refresh-token.entity";
import { Badge } from "../../../src/modules/badges/badge.entity";
import { UserBadge } from "../../../src/modules/badges/user-badge.entity";
import { UserProgress } from "../../../src/modules/progression/user-progress.entity";
import { UserScore } from "../../../src/modules/scoring/user-score.entity";
import { User } from "../../../src/modules/users/user.entity";

const dataSource = new DataSource({
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/test",
  entities: [
    User,
    UserProgress,
    Badge,
    UserBadge,
    GameEvent,
    MagicLinkToken,
    RefreshToken,
    UserScore,
  ],
  synchronize: false,
});

async function cleanup() {
  await dataSource.initialize();
  console.log("[cleanup] Connected to database.");

  const userRepo = dataSource.getRepository(User);

  const testUserEmailPattern = "stress-test-%@test.gameplate.dev";
  const count = await userRepo.count({
    where: { email: Like(testUserEmailPattern) },
  });
  console.log(`[cleanup] Found ${count} test users.`);

  const result = await userRepo.delete({
    email: Like(testUserEmailPattern),
  });
  console.log(
    `[cleanup] Deleted ${result.affected ?? 0} users (cascade handled).`,
  );

  const badgeRepo = dataSource.getRepository(Badge);
  await badgeRepo.delete({ name: "Level 1 Explorer" });
  await badgeRepo.delete({ name: "Star Collector" });
  await badgeRepo.delete({ name: "Quiz Master" });
  console.log("[cleanup] Removed sample badges.");

  await dataSource.destroy();
  console.log("[cleanup] Done.");
}

cleanup().catch((err) => {
  console.error("[cleanup] Failed:", err);
  process.exit(1);
});
