import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Body for POST /auth/oauth/upsert (epic #738, #744). Called
 * server-to-server from the front's NextAuth signIn callback after Google
 * has already verified the email — never directly from a browser.
 */
export class OAuthUpsertDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
