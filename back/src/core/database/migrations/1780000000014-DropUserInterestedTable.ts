import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Drops `user_interested` — the optional "tell me when new phases arrive"
 * e-mail collection, removed from the product entirely.
 *
 * The table held the only personal data the game ever asked a *player* for.
 * With the feature gone the rows have no purpose, and keeping e-mail addresses
 * for a notice that will never be sent is exactly what data minimisation
 * forbids — so the table goes with the code rather than lingering as an
 * orphaned store of personal data.
 *
 * `down()` recreates the structure, matching 1780000000000 as it stood after
 * 1780000000002 dropped `isInterested`. It cannot bring the rows back: this
 * migration deletes personal data on purpose and that deletion is final.
 * Anyone who needs the addresses must export them BEFORE running this.
 */
export class DropUserInterestedTable1780000000014
  implements MigrationInterface
{
  name = "DropUserInterestedTable1780000000014";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_user_interested_email"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "user_interested"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_interested" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_interested" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_interested_email" ON "user_interested" ("email")`,
    );
  }
}
