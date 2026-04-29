import { Injectable } from "@nestjs/common";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
});

@Injectable()
export class ConfigService {
  private config: z.infer<typeof schema>;

  constructor() {
    this.config = schema.parse({
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
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
}
