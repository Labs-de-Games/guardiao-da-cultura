import { Injectable } from "@nestjs/common";
import { z } from "zod";

const schema = z
  .object({
    BACKEND_PORT: z.coerce.number().default(3001),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    // Deployment environment, distinct from NODE_ENV: staging runs with
    // NODE_ENV=production (optimized build) but must still tag its PostHog
    // events as "staging" — staging and production share one project.
    APP_ENV: z
      .enum(["development", "staging", "production"])
      .default("development"),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(1),
    JWT_EXPIRATION: z.string().default("15m"),
    JWT_ISSUER: z.string().default("gameplate"),
    MAGIC_LINK_SECRET: z.string().min(1),
    MAGIC_LINK_EXPIRATION_MIN: z.coerce.number().default(15),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    EMAIL_PROVIDER: z.enum(["mock", "nodemailer"]).default("mock"),
    GMAIL_USER: z.string().optional(),
    GMAIL_APP_PASSWORD: z.string().optional(),
    EMAIL_FROM: z.string().default("42 Rio <noreply@42.rio>"),
    POSTHOG_API_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().url().default("https://us.i.posthog.com"),
    LOG_LEVEL: z
      .enum(["trace", "debug", "info", "warn", "error", "fatal"])
      .default("debug"),
    // Shared secret for the /auth/oauth/upsert endpoint (epic #738, #744).
    // Optional so the app boots without it; the endpoint itself refuses
    // every request when unset (see auth.controller.ts).
    AUTH_OAUTH_UPSERT_TOKEN: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.EMAIL_PROVIDER === "nodemailer") {
        return (
          data.GMAIL_USER !== undefined && data.GMAIL_APP_PASSWORD !== undefined
        );
      }
      return true;
    },
    {
      message:
        "GMAIL_USER and GMAIL_APP_PASSWORD are required when EMAIL_PROVIDER is 'nodemailer'",
    },
  )
  .refine(
    (data) =>
      data.NODE_ENV !== "production" || Boolean(data.AUTH_OAUTH_UPSERT_TOKEN),
    {
      message:
        "AUTH_OAUTH_UPSERT_TOKEN is required in production — Google/institution sign-in silently fails without it",
      path: ["AUTH_OAUTH_UPSERT_TOKEN"],
    },
  );

@Injectable()
export class ConfigService {
  private config: z.infer<typeof schema>;

  constructor() {
    this.config = schema.parse({
      BACKEND_PORT: process.env.BACKEND_PORT,
      NODE_ENV: process.env.NODE_ENV,
      APP_ENV: process.env.APP_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRATION: process.env.JWT_EXPIRATION,
      JWT_ISSUER: process.env.JWT_ISSUER,
      MAGIC_LINK_SECRET: process.env.MAGIC_LINK_SECRET,
      MAGIC_LINK_EXPIRATION_MIN: process.env.MAGIC_LINK_EXPIRATION_MIN,
      FRONTEND_URL: process.env.FRONTEND_URL,
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
      GMAIL_USER: process.env.GMAIL_USER,
      GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD,
      EMAIL_FROM: process.env.EMAIL_FROM,
      POSTHOG_API_KEY: process.env.POSTHOG_API_KEY,
      POSTHOG_HOST: process.env.POSTHOG_HOST,
      LOG_LEVEL: process.env.LOG_LEVEL,
      AUTH_OAUTH_UPSERT_TOKEN: process.env.AUTH_OAUTH_UPSERT_TOKEN,
    });
  }

  get port() {
    return this.config.BACKEND_PORT;
  }
  get nodeEnv() {
    return this.config.NODE_ENV;
  }
  get appEnv() {
    return this.config.APP_ENV;
  }
  get databaseUrl() {
    return this.config.DATABASE_URL;
  }
  get jwtSecret() {
    return this.config.JWT_SECRET;
  }
  get jwtExpiration() {
    return this.config.JWT_EXPIRATION;
  }
  get jwtIssuer() {
    return this.config.JWT_ISSUER;
  }
  get magicLinkSecret() {
    return this.config.MAGIC_LINK_SECRET;
  }
  get magicLinkExpirationMin() {
    return this.config.MAGIC_LINK_EXPIRATION_MIN;
  }
  get frontendUrl() {
    return this.config.FRONTEND_URL;
  }
  get emailProvider() {
    return this.config.EMAIL_PROVIDER;
  }
  get gmailUser() {
    return this.config.GMAIL_USER;
  }
  get gmailAppPassword() {
    return this.config.GMAIL_APP_PASSWORD;
  }
  get emailFrom() {
    return this.config.EMAIL_FROM;
  }
  get posthogApiKey() {
    return this.config.POSTHOG_API_KEY;
  }
  get posthogHost() {
    return this.config.POSTHOG_HOST;
  }
  get logLevel() {
    return this.config.LOG_LEVEL;
  }
  get authOauthUpsertToken() {
    return this.config.AUTH_OAUTH_UPSERT_TOKEN;
  }
}
