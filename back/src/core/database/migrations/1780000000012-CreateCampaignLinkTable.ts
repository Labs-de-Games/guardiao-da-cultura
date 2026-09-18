import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Persists institution-generated campaign links (epic #738 follow-up —
 * dropping the epic's original "no table" decision, confirmed by product
 * as an accepted change). Each row is one `utm_source` group/class link
 * under a fixed `institutionSlug` (the account's own slug — never
 * user-chosen at link-creation time, see scope.ts). Unique per
 * (institutionSlug, source) so an institution can't create the same group
 * label twice.
 */
export class CreateCampaignLinkTable1780000000012
  implements MigrationInterface
{
  name = "CreateCampaignLinkTable1780000000012";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "campaign_link" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "institutionSlug" character varying NOT NULL,
        "source" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_campaign_link_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_campaign_link_slug_source" UNIQUE ("institutionSlug", "source")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_campaign_link_institution_slug" ON "campaign_link" ("institutionSlug")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "campaign_link"`);
  }
}
