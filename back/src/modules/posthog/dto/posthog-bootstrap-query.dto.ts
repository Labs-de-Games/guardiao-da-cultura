import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

/**
 * `bootstrap` is `@Public()`, so `distinct_id` is an unauthenticated,
 * caller-supplied value. Validate format and length before it is ever
 * considered — this bounds the flag-enumeration surface an unvalidated
 * query parameter would otherwise open (an unvalidated caller could assert
 * any identity and read that person's feature flags).
 *
 * Charset and length bound are kept in sync with the front's
 * lib/edital/anonymousPlayer.ts (ANONYMOUS_PLAYER_ID_MAX_LENGTH), since the
 * same value travels as both a cookie and this query parameter.
 */
export class PostHogBootstrapQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^[A-Za-z0-9_-]+$/)
  distinct_id?: string;
}
