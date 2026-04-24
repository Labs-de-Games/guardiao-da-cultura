import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [ConfigModule, DatabaseModule, UsersModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
