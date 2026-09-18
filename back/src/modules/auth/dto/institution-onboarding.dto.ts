import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

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
}
