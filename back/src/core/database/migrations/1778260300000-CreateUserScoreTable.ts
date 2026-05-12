import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserScoreTable1778260300000 implements MigrationInterface {
  name = "CreateUserScoreTable1778260300000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_score" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "levelId" character varying NOT NULL,
        "totalQuarters" integer NOT NULL,
        "totalStars" integer NOT NULL,
        "rating" character varying NOT NULL,
        "floorScores" jsonb,
        "quizScore" jsonb,
        "interactibleScore" jsonb,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_f1a2b3c4d5e6f7a8b9c0d1e2f3a" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_score"`);
  }
}
