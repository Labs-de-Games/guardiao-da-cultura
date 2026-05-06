import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { ConfigService } from "./core/config/config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());

  app.enableCors({
    origin:
      config.nodeEnv === "production"
        ? [config.frontendUrl]
        : [config.frontendUrl, "http://localhost:3000", "http://localhost"],
    credentials: true,
  });

  await app.listen(config.port);
}

bootstrap();
