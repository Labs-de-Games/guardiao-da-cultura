import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "./enums/role.enum";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  nickname!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: "date" })
  dateOfBirth!: Date;

  @Column({
    type: "enum",
    enum: Role,
    default: Role.Player,
  })
  role!: Role;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: "timestamp", nullable: true })
  lastLoginAt!: Date | null;

  /**
   * Nullable — no Institution entity, no per-student data (epic #738,
   * #744). `null` means "not yet linked"; assignment is by admin
   * seed/update script, a known manual step, not a screen. Format
   * validated at the application layer, not here — see
   * ORIGIN_SLUG_PATTERN in the oauth-upsert DTO.
   */
  @Column({ type: "varchar", nullable: true })
  institutionSlug!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
