import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../users/user.entity";

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  token!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user!: User;

  @Column({ type: "timestamp" })
  expiresAt!: Date;

  @Column({ type: "timestamp", nullable: true })
  revokedAt!: Date | null;

  @Column({ type: "varchar", nullable: true })
  replacedByToken!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: "varchar", nullable: true })
  userAgent!: string | null;

  @Column({ type: "varchar", nullable: true })
  ipAddress!: string | null;
}
