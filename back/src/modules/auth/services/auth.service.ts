import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Response } from "express";
import { ConfigService } from "../../../core/config/config.service";
import { EMAIL_SERVICE } from "../../../core/email/email.constants";
import type { IEmailService } from "../../../core/email/interfaces/email-service.interface";
import { UserService } from "../../users/user.service";
import { getCookieConfig } from "../config/cookie.config";
import type { RegisterDto } from "../dto/register.dto";
import { MagicLinkTokenType } from "../enums/magic-link-token-type.enum";
import { MagicLinkService } from "./magic-link.service";
import { TokenService } from "./token.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly magicLinkService: MagicLinkService,
    private readonly configService: ConfigService,
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
  ) {}

  private signLoginAttempt(nonce: string, email: string): string {
    const exp = Math.floor(Date.now() / 1000) + 15 * 60;
    const payload = JSON.stringify({ nonce, email, exp });
    const encoded = Buffer.from(payload).toString("base64url");
    const signature = createHmac("sha256", this.configService.magicLinkSecret)
      .update(encoded)
      .digest("hex");
    return `${encoded}:${signature}`;
  }

  private verifyLoginAttempt(
    cookieValue: string,
  ): { nonce: string; email: string } | null {
    const parts = cookieValue.split(":");
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;

    const expectedSig = createHmac("sha256", this.configService.magicLinkSecret)
      .update(encoded)
      .digest("hex");

    if (
      signature.length !== expectedSig.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encoded, "base64url").toString(),
      ) as { nonce: string; email: string; exp: number };
      if (
        typeof payload.nonce !== "string" ||
        typeof payload.email !== "string" ||
        typeof payload.exp !== "number"
      ) {
        return null;
      }
      if (payload.exp < Math.floor(Date.now() / 1000)) return null;
      return { nonce: payload.nonce, email: payload.email };
    } catch {
      return null;
    }
  }

  setAuthCookies(res: Response, refreshToken: string): void {
    const isProd = this.configService.nodeEnv === "production";
    const cfg = getCookieConfig(isProd);

    res.cookie("refresh_token", refreshToken, cfg.refreshToken);
    res.cookie("auth_status", "authenticated", cfg.authStatus);
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie("refresh_token", { path: "/api/v1/auth" });
    res.clearCookie("auth_status", { path: "/" });
    res.clearCookie("login_attempt", { path: "/api/v1/auth" });
  }

  private setLoginAttemptCookie(
    res: Response,
    nonce: string,
    email: string,
  ): void {
    const isProd = this.configService.nodeEnv === "production";
    const cfg = getCookieConfig(isProd);
    const value = this.signLoginAttempt(nonce, email);
    res.cookie("login_attempt", value, cfg.loginAttempt);
  }

  readLoginAttemptCookie(req: {
    cookies?: Record<string, string>;
  }): { nonce: string; email: string } | null {
    const cookieValue = req.cookies?.login_attempt;
    if (!cookieValue) return null;
    return this.verifyLoginAttempt(cookieValue);
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      return { message: "Veja seu e-mail." };
    }

    const user = await this.userService.create({
      email: dto.email,
      nickname: dto.nickname,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: new Date(dto.dateOfBirth),
      isEmailVerified: false,
      isActive: true,
    });

    const { rawToken } = await this.magicLinkService.createMagicLink(
      user.id,
      MagicLinkTokenType.Verification,
    );

    const verificationUrl = `${this.configService.frontendUrl}/confirm-verification?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(dto.email, verificationUrl);

    return { message: "Veja seu e-mail." };
  }

  async login(
    dto: { email: string },
    res: Response,
  ): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(dto.email);
    if (!user?.isActive || !user.isEmailVerified) {
      return { message: "Veja seu e-mail." };
    }

    const nonce = randomBytes(32).toString("base64url");
    const { rawToken } = await this.magicLinkService.createMagicLink(
      user.id,
      MagicLinkTokenType.MagicLink,
      nonce,
      this.configService.magicLinkExpirationMin,
    );

    this.setLoginAttemptCookie(res, nonce, user.email);

    const magicLinkUrl = `${this.configService.frontendUrl}/confirm-login?token=${rawToken}`;
    await this.emailService.sendMagicLinkEmail(user.email, magicLinkUrl);

    return { message: "Veja seu e-mail." };
  }

  async confirmMagicLinkLogin(
    rawToken: string,
    req: { cookies?: Record<string, string> },
    res: Response,
  ): Promise<{ redirectTo: string }> {
    const cookieData = this.readLoginAttemptCookie(req);
    if (!cookieData) {
      throw new UnauthorizedException("Invalid or expired login attempt");
    }

    const token = await this.magicLinkService.validateTokenConsumption(
      rawToken,
      MagicLinkTokenType.MagicLink,
    );
    if (!token) {
      throw new UnauthorizedException("Invalid or expired magic link");
    }

    if (token.deviceNonce !== cookieData.nonce) {
      throw new UnauthorizedException("Invalid login attempt");
    }

    const refreshToken = await this.tokenService.generateRefreshToken(
      token.user.id,
    );
    this.setAuthCookies(res, refreshToken);
    await this.emailService.sendLoginNotificationEmail(token.user.email);

    return { redirectTo: "/" };
  }

  async confirmVerifyEmail(
    rawToken: string,
    res: Response,
  ): Promise<{ redirectTo: string }> {
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

    const refreshToken = await this.tokenService.generateRefreshToken(user.id);
    this.setAuthCookies(res, refreshToken);
    await this.emailService.sendWelcomeEmail(user.email, user.nickname);

    return { redirectTo: "/" };
  }

  async logout(
    rawRefreshToken: string | undefined,
    accessTokenJti: string | undefined,
    res: Response,
  ): Promise<{ message: string }> {
    if (rawRefreshToken) {
      await this.tokenService.revokeRefreshToken(rawRefreshToken);
    }
    if (accessTokenJti) {
      const exp = Math.floor(Date.now() / 1000) + 15 * 60;
      this.tokenService.addToBlacklist(accessTokenJti, exp);
    }
    this.clearAuthCookies(res);
    return { message: "Sua sessão foi encerrada." };
  }

  async logoutAll(
    userId: string,
    accessTokenJti: string | undefined,
    res: Response,
  ): Promise<{ message: string }> {
    await this.tokenService.revokeAllUserTokens(userId);
    if (accessTokenJti) {
      const exp = Math.floor(Date.now() / 1000) + 15 * 60;
      this.tokenService.addToBlacklist(accessTokenJti, exp);
    }
    this.clearAuthCookies(res);
    return { message: "Sua sessão foi encerrada em todos os dispositivos." };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userService.findByEmail(email);
    if (!user || user.isEmailVerified) {
      return { message: "Veja seu e-mail." };
    }

    await this.magicLinkService.cleanupExpired();

    const { rawToken } = await this.magicLinkService.createMagicLink(
      user.id,
      MagicLinkTokenType.Verification,
    );

    const verificationUrl = `${this.configService.frontendUrl}/confirm-verification?token=${rawToken}`;
    await this.emailService.sendVerificationEmail(email, verificationUrl);

    return { message: "Veja seu e-mail." };
  }
}
