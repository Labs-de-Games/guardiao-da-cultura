import { Equals, IsString, IsUUID, Matches } from "class-validator";

/** Shape only — the value itself is checked against the server's constant. */
const TERMS_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Body for POST /auth/oauth/consent — the accept action for an institution
 * account that already exists and already has a slug, so neither registration
 * nor onboarding can ask it (issue #338).
 *
 * Called server-to-server from the front's own route handler, which derives
 * `userId` from its trusted NextAuth session — never taken from the browser,
 * same trust boundary as /auth/oauth/upsert and /auth/oauth/onboarding.
 */
export class InstitutionConsentDto {
  @IsUUID()
  userId!: string;

  @Equals(true)
  termsAccepted!: boolean;

  @IsString()
  @Matches(TERMS_VERSION_PATTERN, {
    message: "termsVersion must be an ISO date (YYYY-MM-DD)",
  })
  termsVersion!: string;
}
