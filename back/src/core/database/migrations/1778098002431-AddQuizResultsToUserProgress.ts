import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuizResultsToUserProgress1778098002431
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD "quizResults" jsonb NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP COLUMN "quizResults"`,
    );
  }
}
