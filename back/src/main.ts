import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { PostHogInterceptor } from "posthog-node/nestjs";
import { AppModule } from "./app.module";
import { ConfigService } from "./core/config/config.service";
import { PostHogService } from "./modules/posthog/posthog.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const posthogService = app.get(PostHogService);
  const posthogClient = posthogService.getClient();

  if (posthogClient) {
    app.useGlobalInterceptors(
      new PostHogInterceptor(posthogClient, {
        captureExceptions: true,
      }),
    );
  }

  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin:
      config.nodeEnv === "production"
        ? [config.frontendUrl]
        : [config.frontendUrl, "http://localhost"],
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
