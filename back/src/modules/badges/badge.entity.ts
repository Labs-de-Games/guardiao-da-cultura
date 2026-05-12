import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

export enum BadgeType {
  LEVEL = "level",
  COLLECTION = "collection",
  SPECIAL = "special",
}

@Entity()
export class Badge {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column()
  iconUrl!: string;

  @Column({
    type: "enum",
    enum: BadgeType,
    default: BadgeType.LEVEL,
  })
  type!: BadgeType;

  @Column({ type: "varchar", nullable: true })
  statRequired!: string | null;

  @Column({ type: "varchar", default: ">=" })
  condition!: string;

  @Column({ type: "int", default: 1 })
  goalValue!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
