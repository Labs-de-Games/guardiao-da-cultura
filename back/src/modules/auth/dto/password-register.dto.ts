import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length, Matches } from "class-validator";

/**
 * Mirrors front/src/lib/edital/origins.ts ORIGIN_SLUG_PATTERN — no shared
 * package between front/back, so duplicated deliberately (same convention
 * as the front's own scope.ts / oauth-upsert flow already documents).
 */
const INSTITUTION_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
}
