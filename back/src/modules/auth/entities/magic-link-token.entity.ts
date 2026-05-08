import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/user.entity";
import { MagicLinkTokenType } from "../enums/magic-link-token-type.enum";

@Entity()
export class MagicLinkToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  token!: string;

  @Column({
    type: "enum",
    enum: MagicLinkTokenType,
  })
  type!: MagicLinkTokenType;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  usedAt!: Date | null;

  @Column({ nullable: true })
  deviceNonce!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ nullable: true })
  userAgent!: string | null;

  @Column({ nullable: true })
  ipAddress!: string | null;
}
