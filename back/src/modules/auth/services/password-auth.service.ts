import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { Response } from "express";
import { PinoLogger } from "nestjs-pino";
import { ConfigService } from "../../../core/config/config.service";
import { EMAIL_SERVICE } from "../../../core/email/email.constants";
import type { IEmailService } from "../../../core/email/interfaces/email-service.interface";
import { isCurrentTermsVersion } from "../../../shared/consent/institution-terms";
import { ConsentService } from "../../consent/consent.service";
import { ConsentType } from "../../consent/enums/consent-type.enum";
import { PostHogService } from "../../posthog/posthog.service";
import { Role } from "../../users/enums/role.enum";
import { UserService } from "../../users/user.service";
import type { PasswordLoginDto } from "../dto/password-login.dto";
import type { PasswordRegisterDto } from "../dto/password-register.dto";
import { MagicLinkTokenType } from "../enums/magic-link-token-type.enum";
import { AuthService } from "./auth.service";
import { MagicLinkService } from "./magic-link.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";

/**
 * Password credential surface for institution accounts (#747). Separate
 * from AuthService's player-facing magic-link flow, but reuses its cookie
 * helpers, MagicLinkService, and TokenService rather than duplicating them.
 *
 * Account-linking policy (open question in #747, decided here): one row
 * per email, enforced by the existing unique constraint on User.email.
 * Password registration for an email that already exists — whether a
 * Google-linked institution account (#744) or any other account — is
 * refused with the same generic "check your email" style response used by
 * the existing email/magic-link register flow (no enumeration). It does
 * NOT silently attach a password to the existing row. An institution that
 * already signed in via Google and wants a password must use the
 * password-reset flow instead (which also requires the target account to
 * have role === Institution) — reset is the only path that sets a password
 * on a pre-existing account.
 */
@Injectable()
export class PasswordAuthService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly magicLinkService: MagicLinkService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly posthog: PostHogService,
    private readonly consentService: ConsentService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  async register(dto: PasswordRegisterDto): Promise<{ message: string }> {
    // Checked before the duplicate-email short-circuit below: a stale form is
    // the caller's problem either way, and this is the one failure the client
    // must be able to tell apart (it has to reload to get the current text),
    // so it must not be hidden behind the anti-enumeration response.
    if (!isCurrentTermsVersion(dto.termsVersion)) {
      throw new BadRequestException("Outdated terms version");
    }

    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(
        { email: dto.email },
        "Password registration attempted for existing email",
      );
      return { message: "Check your email" };
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.userService.create({
      email: dto.email,
      nickname: dto.nickname,
      firstName: dto.nickname,
      lastName: dto.nickname,
      // Institution accounts have no meaningful date of birth; sentinel
      // epoch, same convention as the OAuth-upsert find-or-create path.
      dateOfBirth: new Date(0),
      role: Role.Institution,
      institutionSlug: dto.institutionSlug,
      passwordHash,
      // Unverified until the confirmation email is clicked — see
      // confirmVerifyEmail below. Password login also refuses an
      // unverified account (same reasoning as the old player magic-link
      // flow this mirrors).
      isEmailVerified: false,
      isActive: true,
    });

    // Immediately after the account exists and before anything else can fail:
    // the account must never be reachable without the record that let it be
    // created. Awaited, unlike the emails below — a consent that failed to
    // persist is not a consent.
    await this.consentService.record(
      user.id,
      ConsentType.InstitutionTerms,
      dto.termsVersion,
    );

    this.logger.info(
      { userId: user.id },
      "Institution password account created",
    );

    const { rawToken } = await this.magicLinkService.createMagicLink(
      user.id,
      MagicLinkTokenType.Verification,
    );
    const verificationUrl = `${this.configService.frontendUrl}/confirm-verification?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(user.email, verificationUrl);

    this.posthog.capture({
      // Account-lifecycle event for a registered (institution) account, not
      // the anonymous player the #864 banner addresses — a different data
      // subject, who never sees the game's consent banner. Gating it on that
      // cookie would suppress institution analytics outright.
      consent: true,
      event: "user_registered",
      distinctId: user.id,
      properties: { method: "password" },
    });

    return { message: "Check your email" };
  }

  async login(
    dto: PasswordLoginDto,
    res: Response,
  ): Promise<{
    redirectTo: string;
    user: {
      id: string;
      email: string;
      role: Role;
      institutionSlug: string | null;
      termsAccepted: boolean;
    };
  }> {
    const genericError = () =>
      new UnauthorizedException("Invalid email or password");

    const user = await this.userService.findByEmailWithPasswordHash(dto.email);

    if (
      !user?.isActive ||
      user.role !== Role.Institution ||
      !user.passwordHash ||
      !user.isEmailVerified
    ) {
      this.logger.warn(
        { email: dto.email },
        "Password login attempted for non-institution, unverified, or passwordless account",
      );
      throw genericError();
    }

    const valid = await this.passwordService.verify(
      user.passwordHash,
      dto.password,
    );
    if (!valid) {
      this.logger.warn({ userId: user.id }, "Password login: wrong password");
      throw genericError();
    }

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);
    this.authService.setAuthCookies(res, refreshToken);
    await this.userService.updateLastLoginAt(user.id);

    this.posthog.capture({
      // See the note on `user_registered` above.
      consent: true,
      event: "user_logged_in",
      distinctId: user.id,
      properties: { method: "password" },
    });
    this.logger.info({ userId: user.id }, "User logged in via password");

    return {
      redirectTo: "/institution",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionSlug: user.institutionSlug,
        // Carried into the NextAuth JWT so middleware can gate the dashboard
        // without a backend round-trip per request. Accounts created before
        // #338 have no record and land on the terms page at their next visit.
        termsAccepted: await this.consentService.hasCurrentConsent(
          user.id,
          ConsentType.InstitutionTerms,
        ),
      },
    };
  }

  /**
   * Confirms the registration email link and logs the institution in, in
   * one request — mirrors the old player magic-link verification flow
   * (AuthService.confirmVerifyEmail on develop), but returns the same
   * `{redirectTo, user}` shape `login` does instead of setting cookies
   * directly: identity travels back to the caller (auth.ts's own
   * "email-verification" NextAuth Credentials provider) in the JSON body,
   * same pattern password login already uses, since this is a
   * server-to-server call with no browser Set-Cookie to piggyback on.
   */
  async confirmVerifyEmail(rawToken: string): Promise<{
    redirectTo: string;
    user: {
      id: string;
      email: string;
      role: Role;
      institutionSlug: string | null;
      termsAccepted: boolean;
    };
  }> {
    const token = await this.magicLinkService.validateTokenConsumption(
      rawToken,
      MagicLinkTokenType.Verification,
    );
    if (!token) {
      throw new UnauthorizedException("Invalid or expired verification link");
    }

    const user = token.user;
    user.isEmailVerified = true;
    await this.userService.save(user);
    await this.userService.updateLastLoginAt(user.id);
    await this.emailService.sendWelcomeEmail(user.email, user.nickname);

    this.posthog.capture({
      // See the note on `user_registered` above.
      consent: true,
      event: "user_verified",
      distinctId: user.id,
      properties: { method: "password" },
    });
    this.logger.info({ userId: user.id }, "Institution email verified");

    return {
      redirectTo: "/institution",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        institutionSlug: user.institutionSlug,
        // Normally true: this link is only reachable after register() wrote
        // the record. Read rather than assumed so a terms revision published
        // between registration and the click is still honoured.
        termsAccepted: await this.consentService.hasCurrentConsent(
          user.id,
          ConsentType.InstitutionTerms,
        ),
      },
    };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user || user.role !== Role.Institution) {
      // Same email/role either way — do not reveal account existence.
      return { message: "Check your email" };
    }

    const { rawToken } = await this.magicLinkService.createMagicLink(
      user.id,
      MagicLinkTokenType.PasswordReset,
    );

    // Outside the /institution/* layout deliberately: that layout's
    // InstitutionGuard requires an authenticated session, but whoever
    // clicks this link is, by definition, not signed in yet.
    const resetUrl = `${this.configService.frontendUrl}/reset-institution-password?token=${rawToken}`;
    await this.emailService.sendMagicLinkEmail(user.email, resetUrl);

    this.logger.info({ userId: user.id }, "Password reset link sent");
    return { message: "Check your email" };
  }

  async confirmPasswordReset(
    rawToken: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const token = await this.magicLinkService.validateTokenConsumption(
      rawToken,
      MagicLinkTokenType.PasswordReset,
    );
    if (!token) {
      throw new UnauthorizedException("Invalid or expired reset link");
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userService.setPasswordHash(token.user.id, passwordHash);

    this.logger.info({ userId: token.user.id }, "Password reset completed");
    this.posthog.capture({
      // See the note on `user_registered` above.
      consent: true,
      event: "password_reset_completed",
      distinctId: token.user.id,
      properties: {},
    });

    return { message: "Password updated" };
  }
}
