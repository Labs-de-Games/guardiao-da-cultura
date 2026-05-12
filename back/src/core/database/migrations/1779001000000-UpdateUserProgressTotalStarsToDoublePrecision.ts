import type { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUserProgressTotalStarsToDoublePrecision1779001000000
  implements MigrationInterface
{
  name = "UpdateUserProgressTotalStarsToDoublePrecision1779001000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "totalStars" TYPE double precision USING "totalStars"::double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_progress" ALTER COLUMN "totalStars" TYPE integer USING "totalStars"::integer`,
    );
  }
}
