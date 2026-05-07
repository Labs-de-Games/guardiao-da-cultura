import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Gameplate API")
    .setDescription("The Gameplate API documentation")
    .setVersion("1.0")
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      "access-token",
    )
    .addCookieAuth("refresh_token", { type: "apiKey" }, "refresh-token")
    .build();
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/v1/docs", app, documentFactory);

  await app.listen(config.port);
}

bootstrap();
