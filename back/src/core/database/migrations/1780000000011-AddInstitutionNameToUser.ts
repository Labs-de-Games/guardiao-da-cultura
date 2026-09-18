import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * institutionName — nullable. Set once, together with `institutionSlug`,
 * by the self-serve onboarding endpoint (POST /auth/oauth/onboarding) that
 * replaces the admin seed-script step #744 originally assumed (there is no
 * admin role/workflow in this project). Both columns are null until then.
 */
export class AddInstitutionNameToUser1780000000011
  implements MigrationInterface
{
  name = "AddInstitutionNameToUser1780000000011";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "institutionName" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "institutionName"`);
  }
}
