import type { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupNullEmailUserInterested1780000000001
  implements MigrationInterface
{
  name = "CleanupNullEmailUserInterested1780000000001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user_interested" WHERE "email" IS NULL`,
    );
  }

  public async down(): Promise<void> {
    // Data loss — cannot reverse
  }
}
