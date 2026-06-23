import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserInterestedTable1780000000000
  implements MigrationInterface
{
  name = "CreateUserInterestedTable1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_interested" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NULL,
        "is_interested" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_interested" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_interested_email" ON "user_interested" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_user_interested_is_interested" ON "user_interested" ("is_interested")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_user_interested_is_interested"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_interested_email"`);
    await queryRunner.query(`DROP TABLE "user_interested"`);
  }
}
