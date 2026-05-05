import { Injectable } from "@nestjs/common";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(1),
  JWT_EXPIRATION: z.string().default("15m"),
  JWT_ISSUER: z.string().default("gameplate"),
  MAGIC_LINK_SECRET: z.string().min(1),
  MAGIC_LINK_EXPIRATION_MIN: z.coerce.number().default(15),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
});

@Injectable()
export class ConfigService {
  private config: z.infer<typeof schema>;

  constructor() {
    this.config = schema.parse({
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRATION: process.env.JWT_EXPIRATION,
      JWT_ISSUER: process.env.JWT_ISSUER,
      MAGIC_LINK_SECRET: process.env.MAGIC_LINK_SECRET,
      MAGIC_LINK_EXPIRATION_MIN: process.env.MAGIC_LINK_EXPIRATION_MIN,
      FRONTEND_URL: process.env.FRONTEND_URL,
    });
  }

  get port() {
    return this.config.PORT;
  }
  get nodeEnv() {
    return this.config.NODE_ENV;
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
}
