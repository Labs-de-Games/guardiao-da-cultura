import "reflect-metadata";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.JWT_EXPIRATION = process.env.JWT_EXPIRATION || "15m";
process.env.JWT_ISSUER = process.env.JWT_ISSUER || "gameplate";
process.env.MAGIC_LINK_SECRET =
  process.env.MAGIC_LINK_SECRET || "test-magic-link-secret";
process.env.MAGIC_LINK_EXPIRATION_MIN =
  process.env.MAGIC_LINK_EXPIRATION_MIN || "15";
process.env.EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || "mock";
