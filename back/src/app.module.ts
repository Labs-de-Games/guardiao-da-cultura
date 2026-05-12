import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule } from "@nestjs/throttler";
import { ConfigModule } from "./core/config/config.module";
import { DatabaseModule } from "./core/database/database.module";
import { GlobalJwtGuardProvider } from "./core/guards/global-jwt.guard";
import { HealthModule } from "./core/health/health.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { RolesGuard } from "./modules/auth/guards/roles.guard";
import { BadgesModule } from "./modules/badges/badges.module";
import { GameModule } from "./modules/game/game.module";
import { ProgressionModule } from "./modules/progression/progression.module";
import { ScoringModule } from "./modules/scoring/scoring.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    AdminModule,
    GameModule,
    ProgressionModule,
    BadgesModule,
    ScoringModule,
    AnalyticsModule,
    HealthModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
  ],
  controllers: [],
  providers: [
    GlobalJwtGuardProvider,
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
