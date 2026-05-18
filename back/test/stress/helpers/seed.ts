import { createHmac, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "reflect-metadata";

const __dirname = dirname(fileURLToPath(import.meta.url));

import { DataSource } from "typeorm";
import { GameEvent } from "../../../src/modules/analytics/game-event.entity";
import { MagicLinkToken } from "../../../src/modules/auth/entities/magic-link-token.entity";
import { RefreshToken } from "../../../src/modules/auth/entities/refresh-token.entity";
import { Badge } from "../../../src/modules/badges/badge.entity";
import { UserBadge } from "../../../src/modules/badges/user-badge.entity";
import { UserProgress } from "../../../src/modules/progression/user-progress.entity";
import { UserScore } from "../../../src/modules/scoring/user-score.entity";
import { User } from "../../../src/modules/users/user.entity";

const USERS_COUNT =
  Number(process.argv.find((a) => a.startsWith("--users="))?.split("=")[1]) ||
  200;

const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
const JWT_ISSUER = process.env.JWT_ISSUER || "gameplate";

const TOKENS_PATH = resolve(__dirname, "../data/tokens.json");

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

function base64url(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function signJwt(userId: string, email: string): string {
  const jti = randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    email,
    role: "player",
    type: "access",
    jti,
    iss: JWT_ISSUER,
    iat: now,
    exp: now + 15 * 60,
  };

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest("base64url");

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

async function seed() {
  await dataSource.initialize();
  console.log(`[seed] Connected to database. Creating ${USERS_COUNT} users...`);

  const userRepo = dataSource.getRepository(User);
  const badgeRepo = dataSource.getRepository(Badge);

  const tokens: Array<{ userId: string; email: string; token: string }> = [];

  const batchSize = 50;
  for (let i = 0; i < USERS_COUNT; i += batchSize) {
    const batch = Math.min(batchSize, USERS_COUNT - i);
    const users = Array.from({ length: batch }, (_, j) => {
      const idx = i + j;
      return userRepo.create({
        email: `stress-test-${idx}@test.gameplate.dev`,
        nickname: `stresstester${idx}`,
        firstName: "Stress",
        lastName: `Tester ${idx}`,
        dateOfBirth: new Date("1990-01-01"),
        role: "player" as const,
        isEmailVerified: true,
        isActive: true,
      });
    });

    const saved = await userRepo.save(users);
    for (const user of saved) {
      const token = signJwt(user.id, user.email);
      tokens.push({ userId: user.id, email: user.email, token });
    }
    console.log(
      `[seed] Created ${saved.length} users (batch ${Math.floor(i / batchSize) + 1})`,
    );
  }

  const existingBadges = await badgeRepo.count();
  if (existingBadges === 0) {
    await badgeRepo.save([
      badgeRepo.create({
        name: "Level 1 Explorer",
        description: "Complete Level 1",
        iconUrl: "/badges/level1.png",
        type: "level" as const,
      }),
      badgeRepo.create({
        name: "Star Collector",
        description: "Collect 10 stars",
        iconUrl: "/badges/stars.png",
        type: "collection" as const,
      }),
      badgeRepo.create({
        name: "Quiz Master",
        description: "Complete all quizzes",
        iconUrl: "/badges/quiz.png",
        type: "special" as const,
      }),
    ]);
    console.log("[seed] Created sample badges");
  }

  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  console.log(`[seed] Wrote ${tokens.length} tokens to ${TOKENS_PATH}`);

  await dataSource.destroy();
  console.log("[seed] Done.");
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
