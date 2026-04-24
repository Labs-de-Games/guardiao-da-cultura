import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "../config/config.service";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.databaseUrl);
        return {
          type: "postgres",
          host: url.hostname,
          port: Number(url.port),
          username: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          autoLoadEntities: true,
          synchronize: config.nodeEnv === "development",
        };
      },
    }),
  ],
})
export class DatabaseModule {}
