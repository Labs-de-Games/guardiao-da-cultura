import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import { ConfigService } from "../../../core/config/config.service";
import { getCookieConfig } from "../config/cookie.config";

/**
 * Only the cookie-setting helper survives here (#738: players never
 * register/login — the magic-link register/login/verify-email flow this
 * service used to implement was removed along with AuthController).
 * PasswordAuthService (institution password login, #747) reuses this so
 * both auth surfaces set the refresh-token/auth_status cookies the same
 * way.
 */
@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  setAuthCookies(res: Response, refreshToken: string): void {
    const isProd = this.configService.nodeEnv === "production";
    const cfg = getCookieConfig(isProd);

    res.cookie("refresh_token", refreshToken, cfg.refreshToken);
    res.cookie("auth_status", "authenticated", cfg.authStatus);
  }
}
