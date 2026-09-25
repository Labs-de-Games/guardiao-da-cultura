import Cookies from "js-cookie";
import { env } from "@/lib/env";

const AUTH_STATUS_COOKIE_NAME = env.client.authStatusCookieName;

export function clearAuthStatusCookie(): void {
  Cookies.remove(AUTH_STATUS_COOKIE_NAME, {
    path: "/",
  });
}
