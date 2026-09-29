import { IsString, Matches, MaxLength } from "class-validator";

/**
 * Same slug shape as front/src/lib/edital/origins.ts's ORIGIN_SLUG_PATTERN
 * — lowercase alphanumeric, single internal hyphens, no leading/trailing/
 * double hyphens. Kept as a literal here rather than shared across the
 * front/back boundary (no shared package in this repo).
 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class CreateCampaignLinkDto {
  /**
   * The caller's own institution slug — always derived server-side from
   * the NextAuth session by the front's route handler, never taken as
   * raw client input at the browser boundary. This DTO still validates
   * its shape since this endpoint is the actual write path.
   */
  @IsString()
  @MaxLength(64)
  @Matches(SLUG_PATTERN)
  institutionSlug!: string;

  /** Group/class label, e.g. "group-a". Same slug shape as institutionSlug. */
  @IsString()
  @MaxLength(64)
  @Matches(SLUG_PATTERN)
  source!: string;
}
