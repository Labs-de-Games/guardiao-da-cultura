import { DataSource } from "typeorm";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  entities: ["src/**/*.entity.ts"],
  migrations: ["src/core/database/migrations/*.ts"],
});
