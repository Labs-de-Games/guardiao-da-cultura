import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigModule } from "./core/config/config.module";
import { DatabaseModule } from "./core/database/database.module";
import { HealthModule } from "./core/health/health.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { BadgesModule } from "./modules/badges/badges.module";
import { GameModule } from "./modules/game/game.module";
import { ProgressionModule } from "./modules/progression/progression.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule,
    DatabaseModule,
    UsersModule,
    GameModule,
    ProgressionModule,
    BadgesModule,
    AnalyticsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
