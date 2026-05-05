import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { GameEventType } from "../../shared/events/game-events";

@Entity()
export class GameEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
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
