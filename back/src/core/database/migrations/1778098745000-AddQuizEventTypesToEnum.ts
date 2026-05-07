import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuizEventTypesToEnum1778098745000
  implements MigrationInterface
{
  name = "AddQuizEventTypesToEnum1778098745000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."game_event_type_enum" ADD VALUE IF NOT EXISTS 'quiz.completed'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."game_event_type_enum" ADD VALUE IF NOT EXISTS 'quiz.failed'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Postgres enums cannot easily remove values; keep down migration as a no-op.
  }
}
