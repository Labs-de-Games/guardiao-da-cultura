import type { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveNonVillainCollectibleTypes1780000000003
  implements MigrationInterface
{
  name = "RemoveNonVillainCollectibleTypes1780000000003";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "user_collectible" WHERE "collectibleType" IN ('COLLECT', 'CLUE_NEXT')`,
    );
  }

  public async down(): Promise<void> {
    // Cannot recover deleted data — this migration is one-way.
  }
}
