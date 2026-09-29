import { ApiProperty } from "@nestjs/swagger";
import { Equals, IsEmail, IsString, Length, Matches } from "class-validator";

/**
 * Mirrors front/src/lib/edital/origins.ts ORIGIN_SLUG_PATTERN — no shared
 * package between front/back, so duplicated deliberately (same convention
 * as the front's own scope.ts / oauth-upsert flow already documents).
 */
const INSTITUTION_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Shape only — the value itself is checked against the server's constant. */
const TERMS_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class PasswordRegisterDto {
  @ApiProperty({
    example: "institution@example.com",
    description: "Institution account email address",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "Correct-Horse-Battery-Staple9",
    description: "Password (minimum 12 characters)",
    minLength: 12,
  })
  @IsString()
  @Length(12, 128)
  password!: string;

  @ApiProperty({
    example: "escola-municipal-centro",
    description: "Institution slug used for tenancy scoping (issue #744)",
  })
  @IsString()
  @Matches(INSTITUTION_SLUG_PATTERN, {
    message: "institutionSlug must be lowercase letters, numbers and hyphens",
  })
  institutionSlug!: string;

  @ApiProperty({ example: "Escola Municipal Centro" })
  @IsString()
  @Length(1, 200)
  nickname!: string;

  /**
   * Acceptance of the Terms of Use (issue #338). `@Equals(true)` rather than
   * `@IsBoolean()`: registration without acceptance is not a valid request, so
   * it is refused at the DTO rather than reaching the service and being
   * silently recorded as a decline.
   */
  @ApiProperty({
    example: true,
    description: "Must be true — registration requires accepting the terms",
  })
  @Equals(true)
  termsAccepted!: boolean;

  /**
   * The terms version the client actually rendered. Checked against the
   * server's own constant in PasswordAuthService.register — see
   * isCurrentTermsVersion for why a mismatch is refused rather than re-stamped.
   */
  @ApiProperty({
    example: "2026-09-28",
    description: "ISO date of the terms version shown to the user",
  })
  @IsString()
  @Matches(TERMS_VERSION_PATTERN, {
    message: "termsVersion must be an ISO date (YYYY-MM-DD)",
  })
  termsVersion!: string;
}
