import type { CookieOptions } from "express";

export interface CookieConfig {
  refreshToken: CookieOptions;
  authStatus: CookieOptions;
  loginAttempt: CookieOptions;
}

export function getCookieConfig(isProd: boolean): CookieConfig {
  const maxAgeDays = 7 * 24 * 60 * 60 * 1000;
  const maxAge15Min = 15 * 60 * 1000;

  return {
    refreshToken: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: maxAgeDays,
    },
    authStatus: {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeDays,
    },
    loginAttempt: {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: maxAge15Min,
    },
  };
}
