import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * game_event has no index beyond its primary key while (timestamp, type) is
 * exactly the hot filter every legacy analytics query uses
 * (analytics.service.ts loads all matching rows filtered only by timestamp
 * + type, with no tenant dimension). #748 keeps that dashboard as a
 * fallback during the coexistence window; an unindexed table with an
 * unbounded ALL_TIME scan is not a sound fallback to promise. This index
 * also carries the new EVENT_LOGGED{severity:"critical"} rows #741 starts
 * writing (see PhaserGame.tsx's critical_error_occurred mirror).
 *
 * Ref: docs/specs/discovery-738-dashboard-edital.md §3.3, §7;
 * docs/specs/implementation-plan-738-dashboard-edital.md step 3 (#741).
 *
 * Migration timestamp reserved ahead of #744/#747's migrations
 * (both also landing in this epic) to avoid a timestamp collision — see
 * discovery §7 "Migration timestamp collision" risk.
 */
export class AddGameEventTimestampTypeIndex1780000000007
  implements MigrationInterface
{
  name = "AddGameEventTimestampTypeIndex1780000000007";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_game_event_timestamp_type" ON "game_event" ("timestamp", "type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_game_event_timestamp_type"`);
  }
}
