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
          // We manage schema via explicit TypeORM migrations.
          // `synchronize` causes the DB to drift and breaks migration runs.
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
