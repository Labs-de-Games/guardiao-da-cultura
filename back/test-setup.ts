import "reflect-metadata";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/test";
