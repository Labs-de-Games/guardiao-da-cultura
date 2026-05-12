import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class UserScore {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  @Column()
  levelId!: string;

  @Column({ type: "int" })
  totalQuarters!: number;

  @Column({ type: "float" })
  totalStars!: number;

  @Column()
  rating!: string;

  @Column({ type: "jsonb", nullable: true })
  floorScores!: Array<{
    floorIndex: number;
    errors: number;
    quartersEarned: number;
  }>;

  @Column({ type: "jsonb", nullable: true })
  quizScore!: {
    totalQuestions: number;
    correctAnswers: number;
    accuracyPercent: number;
    quartersEarned: number;
  };

  @Column({ type: "jsonb", nullable: true })
  collectibleScore!: {
    total: number;
    interactionsCount: number;
    quartersEarned: number;
  };

  @CreateDateColumn()
  timestamp!: Date;
}
