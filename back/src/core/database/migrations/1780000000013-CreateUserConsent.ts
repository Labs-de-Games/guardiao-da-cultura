import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * `user_consent` — append-only record of consent given by an identified
 * account (issue #338: "Consentimentos são registrados no banco com
 * timestamp").
 *
 * Created for the mandatory Terms of Use accepted at institution registration.
 * The player's analytics consent is NOT stored here and never will be: that
 * subject is anonymous, has no `user` row to reference, and keeps its decision
 * in the browser (issue #864).
 *
 * `revokedAt` ships nullable-and-unused. Revocation is a separate slice of
 * #338, but adding the column later would mean a second migration over a table
 * whose purpose is to be an unbroken record.
 *
 * ON DELETE CASCADE is load-bearing for #338's "right to be forgotten":
 * deleting an account must take its consent history with it.
 *
 * Verified up, down and up again against a real Postgres instance — `down()`
 * drops the constraint, index, table and enum type, leaving no trace.
 */
export class CreateUserConsent1780000000013 implements MigrationInterface {
  name = "CreateUserConsent1780000000013";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_consent_type_enum" AS ENUM('institution_terms')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_consent" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "type" "public"."user_consent_type_enum" NOT NULL,
        "version" character varying NOT NULL,
        "acceptedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "revokedAt" TIMESTAMP,
        CONSTRAINT "PK_user_consent_id" PRIMARY KEY ("id")
      )`,
    );
    // Every read is "the newest live consent of this type for this user" —
    // see ConsentService.hasCurrentConsent, which runs on institution requests.
    await queryRunner.query(
      `CREATE INDEX "IDX_user_consent_userId_type" ON "user_consent" ("userId", "type")`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_consent" ADD CONSTRAINT "FK_user_consent_userId"
        FOREIGN KEY ("userId") REFERENCES "user"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_consent" DROP CONSTRAINT "FK_user_consent_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_user_consent_userId_type"`,
    );
    await queryRunner.query(`DROP TABLE "user_consent"`);
    await queryRunner.query(`DROP TYPE "public"."user_consent_type_enum"`);
  }
}
