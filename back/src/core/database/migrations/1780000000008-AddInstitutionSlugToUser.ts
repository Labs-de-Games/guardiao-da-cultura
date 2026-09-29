import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * institutionSlug — nullable, no Institution entity, no per-student data.
 * The tenancy control this column feeds: an account with
 * institutionSlug = null short-circuits before any upstream PostHog call
 * and renders the empty "awaiting linkage" state (#744). Assignment is by
 * admin seed/update script — there is no linking UI yet, and #744's issue
 * text is explicit that this is a known manual step, not a screen to
 * pretend exists.
 *
 * Format is NOT validated at write time (no DTO field, no DB
 * constraint — keeps this migration purely additive and reversible);
 * front/src/lib/edital/server/scope.ts's `resolveScope` validates it
 * defensively on every read instead, the one real chokepoint before a
 * Scope reaches a query.
 *
 * Migration timestamp reserved after 1780000000007 (game_event index,
 * landing separately in #741's branch) to avoid a collision once both
 * merge. Reserve 1780000000009 for #747's password-hash migration, the
 * next one to land in this epic.
 */
export class AddInstitutionSlugToUser1780000000008
  implements MigrationInterface
{
  name = "AddInstitutionSlugToUser1780000000008";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "institutionSlug" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "institutionSlug"`);
  }
}
