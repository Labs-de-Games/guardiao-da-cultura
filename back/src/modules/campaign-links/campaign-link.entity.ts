import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@Index("IDX_campaign_link_institution_slug", ["institutionSlug"])
export class CampaignLink {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  institutionSlug!: string;

  /** The group/class label — e.g. "group-a" — emitted as `utm_source`. */
  @Column({ type: "varchar" })
  source!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
