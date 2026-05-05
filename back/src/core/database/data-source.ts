import { DataSource } from "typeorm";
import { GameEvent } from "../../modules/analytics/game-event.entity";
import { Badge } from "../../modules/badges/badge.entity";
import { UserBadge } from "../../modules/badges/user-badge.entity";
import { UserProgress } from "../../modules/progression/user-progress.entity";
import { User } from "../../modules/users/user.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: [User, UserProgress, Badge, UserBadge, GameEvent],
  migrations: ["src/core/database/migrations/*.ts"],
  migrationsTableName: "migrations",
  synchronize: false,
});
