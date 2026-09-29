import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "../users/user.entity";
import { ConsentType } from "./enums/consent-type.enum";

/**
 * One row per act of consent (issue #338: "Consentimentos são registrados no
 * banco com timestamp").
 *
 * Append-only on purpose. Re-accepting a revised text inserts another row
 * instead of updating the old one, so the table answers "what did this account
 * agree to, and when" for every version it ever saw — which is the whole point
 * of keeping it in Postgres rather than in a column that the next acceptance
 * would overwrite.
 *
 * Deliberately unlike the player's analytics consent, which lives only in the
 * browser (localStorage + the `gp_analytics_consent` cookie): that subject is
 * anonymous and has no row to attach anything to. An institution is an
 * identified account, and its acceptance has to survive a cleared browser.
 *
 * There is no `@UpdateDateColumn`: nothing may rewrite a recorded consent.
 */
@Entity("user_consent")
@Index(["userId", "type"])
export class UserConsent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  userId!: string;

  /**
   * CASCADE so deleting an account takes its consent history with it —
   * required by #338's "right to be forgotten", and the reason this is a real
   * foreign key rather than a loose id column.
   */
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "enum", enum: ConsentType })
  type!: ConsentType;

  /**
   * ISO `YYYY-MM-DD` publication date of the exact text accepted, as a string
   * rather than a date: it is an identifier for a document, not a moment, and
   * lexicographic comparison on this format is already chronological.
   */
  @Column({ type: "varchar" })
  version!: string;

  @CreateDateColumn({ type: "timestamp" })
  acceptedAt!: Date;

  /**
   * Set when consent is withdrawn; `null` while it stands.
   *
   * Nothing writes this yet — revocation and account deletion are their own
   * slice of #338. The column exists now because adding it later would mean a
   * second migration over a table whose whole purpose is to be an unbroken
   * record.
   */
  @Column({ type: "timestamp", nullable: true })
  revokedAt!: Date | null;
}
