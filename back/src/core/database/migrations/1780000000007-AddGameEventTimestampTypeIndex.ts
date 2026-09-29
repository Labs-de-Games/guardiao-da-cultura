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
 * Ref: #738 dashboard plan, step 3 (#741).
 *
 * Migration timestamp reserved ahead of #744/#747's migrations
 * (both also landing in this epic) to avoid a timestamp collision — see
 * discovery §7 "Migration timestamp collision" risk.
 *
 * `CONCURRENTLY` so index creation doesn't hold a write lock on
 * `game_event` — a table this migration's own comment says is unindexed
 * and scanned unbounded. `CONCURRENTLY` can't run inside a transaction,
 * hence `transaction = false` below (TypeORM's per-migration opt-out).
 */
export class AddGameEventTimestampTypeIndex1780000000007
  implements MigrationInterface
{
  name = "AddGameEventTimestampTypeIndex1780000000007";
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY "IDX_game_event_timestamp_type" ON "game_event" ("timestamp", "type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY "IDX_game_event_timestamp_type"`,
    );
  }
}
