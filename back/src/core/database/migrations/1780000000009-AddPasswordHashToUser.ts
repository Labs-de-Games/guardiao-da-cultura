import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * passwordHash — nullable. User is 100% passwordless (magic link) today;
 * this is a new credential surface for institution accounts specifically
 * (issue #747), not a general player feature. Null means "no password
 * set" (a Google-only account, or a magic-link player account).
 *
 * Migration timestamp reserved in step 6 (#744, migration
 * 1780000000008) specifically to avoid a collision with this one — both
 * land in this same epic. Verified up and down against a real Postgres
 * instance.
 */
export class AddPasswordHashToUser1780000000009 implements MigrationInterface {
  name = "AddPasswordHashToUser1780000000009";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passwordHash" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "passwordHash"`);
  }
}
