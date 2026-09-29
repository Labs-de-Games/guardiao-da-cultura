import {
  Equals,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

/** Shape only — the value itself is checked against the server's constant. */
const TERMS_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Body for POST /auth/oauth/onboarding. Called server-to-server from the
 * front's own onboarding route handler, which derives `userId` from its
 * own trusted NextAuth session server-side — never taken from the browser
 * directly, same trust boundary as /auth/oauth/upsert.
 */
export class InstitutionOnboardingDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  institutionName!: string;

  /**
   * Acceptance of the Terms of Use (issue #338). Required here as well as on
   * password registration: a Google sign-up never visits /register, so this is
   * the only point at which that account can be asked before it reaches the
   * dashboard.
   */
  @Equals(true)
  termsAccepted!: boolean;

  /** The terms version the client rendered — checked against the constant. */
  @IsString()
  @Matches(TERMS_VERSION_PATTERN, {
    message: "termsVersion must be an ISO date (YYYY-MM-DD)",
  })
  termsVersion!: string;
}
