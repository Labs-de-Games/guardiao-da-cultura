import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserCollectibleTable1779010000000
  implements MigrationInterface
{
  name = "CreateUserCollectibleTable1779010000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_collectible" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying NOT NULL,
        "collectibleId" character varying NOT NULL,
        "collectibleType" character varying NOT NULL,
        "levelId" character varying NOT NULL,
        "collectedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_collectible" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_collectible_unique" ON "user_collectible"
      ("userId", "collectibleId", "collectibleType")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_collectible_user" ON "user_collectible" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_collectible_user"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_collectible_unique"`,
    );
    await queryRunner.query(`DROP TABLE "user_collectible"`);
  }
}
