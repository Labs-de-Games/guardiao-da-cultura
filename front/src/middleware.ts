import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS,
  ANONYMOUS_PLAYER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_MAX_AGE_SECONDS,
  generateAnonymousPlayerId,
  isValidAnonymousPlayerId,
} from "./lib/edital/anonymousPlayer";

const AUTH_STATUS_COOKIE_NAME = "auth_status";
const GUEST_PLAY_COOKIE_NAME = "gp_guest_play";

const PROTECTED_ROUTES: string[] = [];
const INSTITUTION_ROUTE_PREFIX = "/institution";
const GUEST_ROUTES = [
  "/login",
  "/register",
  "/verify-email",
  "/confirm-login",
  "/confirm-verification",
];

function isProtectedRoute(path: string): boolean {
  return PROTECTED_ROUTES.some((route) => path === route);
}

function isInstitutionRoute(path: string): boolean {
  return (
    path === INSTITUTION_ROUTE_PREFIX ||
    path.startsWith(`${INSTITUTION_ROUTE_PREFIX}/`)
  );
}

function isGuestRoute(path: string): boolean {
  return GUEST_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}?`),
  );
}

/**
 * Stamp the durable anonymous-player cookie onto whichever response this
 * request produces, unless it already carries a valid one. Runs in
 * middleware (this app's own origin, ahead of any client JS) so the id is
 * a server-set cookie with an explicit Max-Age, not a client
 * `document.cookie` write on a session-scoped cookie — see
 * docs/specs/discovery-738-dashboard-edital.md §5.1.
 */
function withAnonymousPlayerCookie(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const existing = request.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME)?.value;
  if (isValidAnonymousPlayerId(existing)) {
    return response;
  }

  response.cookies.set(
    ANONYMOUS_PLAYER_COOKIE_NAME,
    generateAnonymousPlayerId(),
    {
      maxAge: ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    },
  );
  // Signals to client JS, for one request only, that the cookie above was
  // just minted — not a returning value — so the legacy-guest-id migration
  // (lib/edital/anonymousPlayer.ts) knows it's safe to act.
  response.cookies.set(ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME, "1", {
    maxAge: ANONYMOUS_PLAYER_SEEDED_MARKER_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const authStatus = request.cookies.get(AUTH_STATUS_COOKIE_NAME)?.value;
  const isAuthenticated = authStatus === "authenticated";
  const guestPlayEnabled =
    request.cookies.get(GUEST_PLAY_COOKIE_NAME)?.value === "1";

  if (isInstitutionRoute(path) && !isAuthenticated) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return withAnonymousPlayerCookie(
      request,
      NextResponse.redirect(redirectUrl),
    );
  }

  if (isProtectedRoute(path) && !isAuthenticated && !guestPlayEnabled) {
    const redirectUrl = new URL("/register", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return withAnonymousPlayerCookie(
      request,
      NextResponse.redirect(redirectUrl),
    );
  }

  if (isGuestRoute(path) && isAuthenticated) {
    return withAnonymousPlayerCookie(
      request,
      NextResponse.redirect(new URL("/", request.url)),
    );
  }

  return withAnonymousPlayerCookie(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/verify-email",
    "/confirm-login",
    "/confirm-verification",
    "/institution/:path*",
    "/game/:path*",
  ],
};
