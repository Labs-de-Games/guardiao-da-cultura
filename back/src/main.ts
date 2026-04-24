import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "./config/config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix("api/v1");

  app.enableCors({
    origin:
      config.nodeEnv === "production"
        ? ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://localhost"],
    credentials: true,
  });

  await app.listen(config.port);
}

bootstrap();
