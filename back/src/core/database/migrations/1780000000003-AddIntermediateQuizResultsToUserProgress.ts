import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIntermediateQuizResultsToUserProgress1780000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD "intermediateQuizResults" jsonb NOT NULL DEFAULT '{}'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."game_event_type_enum" ADD VALUE IF NOT EXISTS 'intermediate-quiz.completed'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."game_event_type_enum" ADD VALUE IF NOT EXISTS 'intermediate-quiz.failed'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP COLUMN "intermediateQuizResults"`,
    );

    // Postgres enums cannot easily remove values; keep down migration as a no-op for enum.
  }
}
