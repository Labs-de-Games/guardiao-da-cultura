import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ConfigService } from "../../../core/config/config.service";
import type { User } from "../../users/user.entity";
import { CurrentUser } from "../decorators/current-user.decorator";
import { Public } from "../decorators/public.decorator";
import { ThrottleByEmail } from "../decorators/throttle-by-email.decorator";
import { AuthUserDto } from "../dto/auth-response.dto";
import { LoginDto } from "../dto/login.dto";
import { LoginConfirmDto } from "../dto/login-confirm.dto";
import { RegisterDto } from "../dto/register.dto";
import { ResendVerificationDto } from "../dto/resend-verification.dto";
import { VerifyEmailConfirmDto } from "../dto/verify-email-confirm.dto";
import { MagicLinkTokenType } from "../enums/magic-link-token-type.enum";
import { AuthService } from "../services/auth.service";
import { MagicLinkService } from "../services/magic-link.service";
import { TokenService } from "../services/token.service";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly magicLinkService: MagicLinkService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  private getJtiFromHeader(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return undefined;
    const token = authHeader.slice(7);
    try {
      const payload = this.jwtService.decode(token);
      if (
        payload &&
        typeof payload === "object" &&
        "jti" in payload &&
        typeof payload.jti === "string"
      ) {
        return payload.jti;
      }
    } catch {
      // ignore decode errors
    }
    return undefined;
  }

  @Public()
  @ThrottleByEmail(3, 3600000)
  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterDto })
  @ApiOkResponse({
    description: "User registered successfully",
    schema: {
      example: { message: "Registration successful. Please check your email." },
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid input or user already exists",
  })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(dto);
  }

  @Public()
  @ThrottleByEmail(5, 3600000)
  @Post("login")
  @ApiOperation({ summary: "Request login magic link" })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: "Magic link sent to email",
    schema: { example: { message: "Check your email for the login link." } },
  })
  @ApiBadRequestResponse({ description: "Invalid email" })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    return this.authService.login(dto, res);
  }

  @Public()
  @Get("login")
  @ApiOperation({ summary: "Validate magic link login preview" })
  @ApiQuery({ name: "token", description: "Magic link token", required: true })
  @ApiQuery({ name: "nonce", description: "Device nonce", required: true })
  @ApiOkResponse({
    description: "Redirects to frontend login confirmation page",
  })
  @ApiBadRequestResponse({ description: "Missing or invalid token/nonce" })
  async loginPreview(
    @Query("token") rawToken: string,
    @Query("nonce") nonce: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!rawToken || !nonce) {
      res.redirect(`${this.configService.frontendUrl}/login?error=expired`);
      return;
    }

    const cookieData = this.authService.readLoginAttemptCookie(req);
    if (!cookieData || cookieData.nonce !== nonce) {
      res.redirect(
        `${this.configService.frontendUrl}/login?error=wrong_device`,
      );
      return;
    }

    const token = await this.magicLinkService.validateTokenPreview(
      rawToken,
      MagicLinkTokenType.MagicLink,
    );
    if (!token) {
      res.redirect(`${this.configService.frontendUrl}/login?error=expired`);
      return;
    }

    res.redirect(
      `${this.configService.frontendUrl}/auth/confirm-login?token=${rawToken}`,
    );
  }

  @Public()
  @Post("login/confirm")
  @ApiOperation({ summary: "Confirm magic link login" })
  @ApiBody({ type: LoginConfirmDto })
  @ApiOkResponse({
    description: "Login confirmed, sets auth cookies",
    schema: { example: { redirectTo: "/dashboard" } },
  })
  @ApiBadRequestResponse({ description: "Invalid or expired token" })
  async confirmLogin(
    @Body() dto: LoginConfirmDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ redirectTo: string }> {
    return this.authService.confirmMagicLinkLogin(dto.token, req, res);
  }

  @Post("logout")
  @ApiOperation({ summary: "Logout current session" })
  @ApiCookieAuth("refresh-token")
  @ApiBearerAuth("access-token")
  @ApiOkResponse({
    description: "Logged out successfully",
    schema: { example: { message: "Logged out successfully" } },
  })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    const jti = this.getJtiFromHeader(req);
    return this.authService.logout(refreshToken, jti, res);
  }

  @Post("logout-all")
  @ApiBearerAuth("access-token")
  @ApiCookieAuth("refresh-token")
  @ApiOperation({ summary: "Logout from all devices" })
  @ApiOkResponse({
    description: "Logged out from all devices",
    schema: { example: { message: "Logged out from all devices" } },
  })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  async logoutAll(
    @CurrentUser() user: User & { jti?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    await this.authService.logoutAll(user.id, user.jti, res);
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }
    return { message: "Logged out from all devices" };
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token" })
  @ApiCookieAuth("refresh-token")
  @ApiOkResponse({
    description: "New access token generated",
    schema: { example: { accessToken: "eyJhbGciOiJIUzI1NiIs..." } },
  })
  @ApiUnauthorizedResponse({ description: "Invalid or missing refresh token" })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException("No refresh token provided");
    }

    const result = await this.tokenService.rotateRefreshToken(refreshToken);
    this.authService.setAuthCookies(res, result.refreshToken);
    return { accessToken: result.accessToken };
  }

  @Get("me")
  @ApiBearerAuth("access-token")
  @ApiOperation({ summary: "Get current user profile" })
  @ApiOkResponse({ description: "Current user data", type: AuthUserDto })
  @ApiUnauthorizedResponse({ description: "Invalid or missing token" })
  async me(@CurrentUser() user: User): Promise<AuthUserDto> {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };
  }

  @Public()
  @Get("verify-email")
  @ApiOperation({ summary: "Validate email verification token preview" })
  @ApiQuery({
    name: "token",
    description: "Email verification token",
    required: true,
  })
  @ApiOkResponse({
    description: "Redirects to frontend email verification page",
  })
  @ApiBadRequestResponse({ description: "Missing or invalid token" })
  async verifyEmailPreview(
    @Query("token") rawToken: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!rawToken) {
      res.redirect(`${this.configService.frontendUrl}/login?error=expired`);
      return;
    }

    const token = await this.magicLinkService.validateTokenPreview(
      rawToken,
      MagicLinkTokenType.Verification,
    );
    if (!token) {
      res.redirect(`${this.configService.frontendUrl}/login?error=expired`);
      return;
    }

    res.redirect(
      `${this.configService.frontendUrl}/auth/confirm-verification?token=${rawToken}`,
    );
  }

  @Public()
  @Post("verify-email/confirm")
  @ApiOperation({ summary: "Confirm email verification" })
  @ApiBody({ type: VerifyEmailConfirmDto })
  @ApiOkResponse({
    description: "Email verified successfully",
    schema: { example: { redirectTo: "/dashboard" } },
  })
  @ApiBadRequestResponse({ description: "Invalid or expired token" })
  async confirmVerifyEmail(
    @Body() dto: VerifyEmailConfirmDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ redirectTo: string }> {
    return this.authService.confirmVerifyEmail(dto.token, res);
  }

  @Public()
  @ThrottleByEmail(3, 3600000)
  @Post("resend-verification")
  @ApiOperation({ summary: "Resend email verification" })
  @ApiBody({ type: ResendVerificationDto })
  @ApiOkResponse({
    description: "Verification email sent",
    schema: { example: { message: "Verification email sent" } },
  })
  @ApiBadRequestResponse({
    description: "Invalid email or email already verified",
  })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<{ message: string }> {
    return this.authService.resendVerificationEmail(dto.email);
  }
}
