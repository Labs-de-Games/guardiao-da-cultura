import { DataSource } from "typeorm";
import { GameEvent } from "../../modules/analytics/game-event.entity";
import { MagicLinkToken } from "../../modules/auth/entities/magic-link-token.entity";
import { RefreshToken } from "../../modules/auth/entities/refresh-token.entity";
import { Badge } from "../../modules/badges/badge.entity";
import { UserBadge } from "../../modules/badges/user-badge.entity";
import { UserConsent } from "../../modules/consent/user-consent.entity";
import { UserProgress } from "../../modules/progression/user-progress.entity";
import { UserCollectible } from "../../modules/scoring/user-collectible.entity";
import { UserScore } from "../../modules/scoring/user-score.entity";
import { User } from "../../modules/users/user.entity";

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [
    User,
    UserProgress,
    Badge,
    UserBadge,
    GameEvent,
    MagicLinkToken,
    RefreshToken,
    UserScore,
    UserCollectible,
    UserConsent,
  ],
  migrations: isProduction
    ? ["dist/core/database/migrations/*.js"]
    : ["src/core/database/migrations/*.ts"],
  migrationsTableName: "migrations",
  migrationsTransactionMode: "each",
  synchronize: false,
});
