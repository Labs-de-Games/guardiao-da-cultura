import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigModule } from "./core/config/config.module";
import { DatabaseModule } from "./core/database/database.module";
import { HealthModule } from "./core/health/health.module";
import { GameModule } from "./modules/game/game.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ConfigModule,
    DatabaseModule,
    UsersModule,
    GameModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
