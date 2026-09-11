import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GameEventType } from "../../shared/events/game-events";

// Mirrors migration 1780000000007-AddGameEventTimestampTypeIndex — kept
// here too (synchronize is off, so this alone changes nothing in the DB)
// so the entity and the schema don't silently drift apart.
@Index("IDX_game_event_timestamp_type", ["timestamp", "type"])
@Entity()
export class GameEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", nullable: true })
  userId?: string;

  @Column({
    type: "enum",
    enum: GameEventType,
  })
  type!: GameEventType;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: "timestamptz" })
  timestamp!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
