import { Body, Controller, Post, Res } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import { Public } from "../decorators/public.decorator";
import { ThrottleByEmail } from "../decorators/throttle-by-email.decorator";
import { PasswordLoginDto } from "../dto/password-login.dto";
import { PasswordRegisterDto } from "../dto/password-register.dto";
import { PasswordResetConfirmDto } from "../dto/password-reset-confirm.dto";
import { PasswordResetRequestDto } from "../dto/password-reset-request.dto";
import { VerifyEmailConfirmDto } from "../dto/verify-email-confirm.dto";
import { PasswordAuthService } from "../services/password-auth.service";

/**
 * Password credential surface for institution accounts (#747). Kept as
 * its own controller under the same `auth` route prefix rather than folded
 * into AuthController, since it's a distinct concern (institution-only,
 * argon2id) with its own rate-limit budgets.
 */
@ApiTags("Authentication")
@Controller("auth/password")
export class PasswordAuthController {
  constructor(private readonly passwordAuthService: PasswordAuthService) {}

  @Public()
  @ThrottleByEmail(3, 3600000)
  @Post("register")
  @ApiOperation({
    summary: "Register a new institution account with a password",
  })
  @ApiBody({ type: PasswordRegisterDto })
  @ApiOkResponse({
    description: "Account created (or generic message if email already used)",
    schema: { example: { message: "Check your email" } },
  })
  @ApiBadRequestResponse({ description: "Invalid input" })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async register(
    @Body() dto: PasswordRegisterDto,
  ): Promise<{ message: string }> {
    return this.passwordAuthService.register(dto);
  }

  @Public()
  @ThrottleByEmail(5, 900000)
  @Post("login")
  @ApiOperation({
    summary: "Login with email + password (institution accounts only)",
  })
  @ApiBody({ type: PasswordLoginDto })
  @ApiOkResponse({
    description: "Login successful, sets auth cookies",
    schema: { example: { redirectTo: "/institution" } },
  })
  @ApiUnauthorizedResponse({ description: "Invalid email or password" })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async login(
    @Body() dto: PasswordLoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ redirectTo: string }> {
    return this.passwordAuthService.login(dto, res);
  }

  @Public()
  @Post("verify-email/confirm")
  @ApiOperation({
    summary: "Confirm a registration email link and log the institution in",
  })
  @ApiBody({ type: VerifyEmailConfirmDto })
  @ApiOkResponse({
    description:
      "Email verified; returns the institution's identity so the caller can establish a session",
    schema: { example: { redirectTo: "/institution" } },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid or expired verification link",
  })
  async confirmVerifyEmail(
    @Body() dto: VerifyEmailConfirmDto,
  ): Promise<{ redirectTo: string }> {
    return this.passwordAuthService.confirmVerifyEmail(dto.token);
  }

  @Public()
  @ThrottleByEmail(3, 3600000)
  @Post("reset/request")
  @ApiOperation({ summary: "Request a password reset link" })
  @ApiBody({ type: PasswordResetRequestDto })
  @ApiOkResponse({
    description: "Reset link sent if the account exists",
    schema: { example: { message: "Check your email" } },
  })
  @ApiTooManyRequestsResponse({ description: "Too many requests" })
  async requestReset(
    @Body() dto: PasswordResetRequestDto,
  ): Promise<{ message: string }> {
    return this.passwordAuthService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post("reset/confirm")
  @ApiOperation({ summary: "Confirm a password reset with a new password" })
  @ApiBody({ type: PasswordResetConfirmDto })
  @ApiOkResponse({
    description: "Password updated",
    schema: { example: { message: "Password updated" } },
  })
  @ApiUnauthorizedResponse({ description: "Invalid or expired reset link" })
  async confirmReset(
    @Body() dto: PasswordResetConfirmDto,
  ): Promise<{ message: string }> {
    return this.passwordAuthService.confirmPasswordReset(
      dto.token,
      dto.newPassword,
    );
  }
}
