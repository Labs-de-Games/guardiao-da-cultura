import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Adds 'password_reset' to magic_link_token_type_enum so password-reset
 * flow (#747) can reuse MagicLinkService/MagicLinkToken instead of a new
 * table. Postgres enums cannot drop values cleanly, so down is a no-op —
 * same convention as 1780000000004 (AddIntermediateQuizResultsToUserProgress,
 * which added enum values to game_event_type_enum the same way).
 */
export class AddPasswordResetToMagicLinkTokenTypeEnum1780000000010
  implements MigrationInterface
{
  name = "AddPasswordResetToMagicLinkTokenTypeEnum1780000000010";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."magic_link_token_type_enum" ADD VALUE IF NOT EXISTS 'password_reset'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres enums cannot easily remove values; keep down migration as a no-op.
  }
}
