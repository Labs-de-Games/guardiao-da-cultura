import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddIntermediateQuizScoreToUserScore1780000000005
  implements MigrationInterface
{
  name = "AddIntermediateQuizScoreToUserScore1780000000005";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_score" ADD "intermediateQuizScore" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_score" DROP COLUMN "intermediateQuizScore"`,
    );
  }
}
