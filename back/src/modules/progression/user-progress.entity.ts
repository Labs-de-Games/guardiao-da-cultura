import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../modules/users/user.entity";

@Entity()
export class UserProgress {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @OneToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ default: 1 })
  currentLevel!: number;

  @Column({ type: "double precision", default: 0 })
  totalStars!: number;

  @Column({ type: "jsonb", default: "{}" })
  completedLevels = "{}";

  @Column({ type: "jsonb", default: "{}" })
  clues = "{}";

  @Column({ type: "jsonb", default: "{}" })
  quizResults = "{}";

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
