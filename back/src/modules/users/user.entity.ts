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
   * #744). `null` means "not yet linked". #744 originally assumed an
   * admin seed/update script would set this; this project has no admin
   * role/workflow, so it's instead set once by the self-serve onboarding
   * endpoint (POST /auth/oauth/onboarding), server-derived from
   * `institutionName` — never taken as raw client input. The one real
   * *read-time* enforcement point is
   * front/src/lib/edital/server/scope.ts's `resolveScope`, which validates
   * the slug format defensively on every read before it ever becomes a
   * query `Scope`.
   */
  @Column({ type: "varchar", nullable: true })
  institutionSlug!: string | null;

  /**
   * Display name entered by the institution during onboarding
   * (POST /auth/oauth/onboarding), set together with `institutionSlug` in
   * the same request. Null until then, same as `institutionSlug`.
   */
  @Column({ type: "varchar", nullable: true })
  institutionName!: string | null;

  /**
   * argon2id hash, nullable — `User` is 100% passwordless (magic link)
   * otherwise. `null` means "no password set" (a Google-only institution
   * account, or a magic-link player account). New credential surface for
   * institution accounts specifically (issue #747), not a general player
   * feature. Never select this column into an API response.
   */
  @Column({ type: "varchar", nullable: true, select: false })
  passwordHash!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
