import { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { UsersModule } from "./users/users.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [ConfigModule, DatabaseModule, UsersModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
