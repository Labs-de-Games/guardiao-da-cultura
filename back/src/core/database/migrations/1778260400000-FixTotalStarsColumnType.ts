import type { MigrationInterface, QueryRunner } from "typeorm";

export class FixTotalStarsColumnType1778260400000
  implements MigrationInterface
{
  name = "FixTotalStarsColumnType1778260400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_score" ALTER COLUMN "totalStars" TYPE double precision USING "totalStars"::double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_score" ALTER COLUMN "totalStars" TYPE integer USING "totalStars"::integer`,
    );
  }
}
