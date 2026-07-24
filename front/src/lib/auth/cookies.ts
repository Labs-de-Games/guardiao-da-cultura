import Cookies from "js-cookie";
import { env } from "@/lib/env";

const AUTH_STATUS_COOKIE_NAME = env.client.authStatusCookieName;

export function setAuthStatusCookie(): void {
  Cookies.set(AUTH_STATUS_COOKIE_NAME, "authenticated", {
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: 7,
  });
}

export function clearAuthStatusCookie(): void {
  Cookies.remove(AUTH_STATUS_COOKIE_NAME, {
    path: "/",
  });
}

export function hasAuthStatusCookie(): boolean {
  return Cookies.get(AUTH_STATUS_COOKIE_NAME) === "authenticated";
}
