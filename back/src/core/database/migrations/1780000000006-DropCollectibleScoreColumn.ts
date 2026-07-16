import type { MigrationInterface, QueryRunner } from "typeorm";

export class DropCollectibleScoreColumn1780000000006
  implements MigrationInterface
{
  name = "DropCollectibleScoreColumn1780000000006";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_score" DROP COLUMN "collectibleScore"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_score" ADD "collectibleScore" jsonb`,
    );
  }
}
