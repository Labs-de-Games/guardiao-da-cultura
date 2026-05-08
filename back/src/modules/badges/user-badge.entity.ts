import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../../modules/users/user.entity";
import { Badge } from "./badge.entity";

@Entity()
export class UserBadge {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column()
  badgeId!: string;

  @ManyToOne(() => Badge, { onDelete: "CASCADE" })
  @JoinColumn({ name: "badgeId" })
  badge!: Badge;

  @CreateDateColumn()
  earnedAt!: Date;
}
