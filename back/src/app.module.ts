import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ConfigModule } from "./config/config.module";
import { DatabaseModule } from "./database/database.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [ConfigModule, DatabaseModule, UsersModule],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
