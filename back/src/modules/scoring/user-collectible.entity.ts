import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

export type CollectibleType = "COLLECT" | "CLUE_VILLAIN" | "CLUE_NEXT";

@Entity()
@Index(["userId", "collectibleId", "collectibleType"], { unique: true })
export class UserCollectible {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  collectibleId!: string;

  @Column()
  collectibleType!: CollectibleType;

  @Column()
  levelId!: string;

  @CreateDateColumn()
  collectedAt!: Date;
}
