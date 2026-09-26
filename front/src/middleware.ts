import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isMaintenanceModeEnabled } from "@/lib/maintenance";
import {
  GAME_MAINTENANCE_PATH,
  isGameRoute,
} from "@/lib/navigation/gameRoutes";
import { auth } from "./auth.config";
import {
  ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS,
  ANONYMOUS_PLAYER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_MAX_AGE_SECONDS,
  generateAnonymousPlayerId,
  isValidAnonymousPlayerId,
} from "./lib/edital/anonymousPlayer";

const SERVICE_UNAVAILABLE_STATUS = 503;
const INSTITUTION_ROUTE_PREFIX = "/institution";
const ONBOARDING_PATH = `${INSTITUTION_ROUTE_PREFIX}/onboarding`;

function isInstitutionRoute(path: string): boolean {
  return (
    path === INSTITUTION_ROUTE_PREFIX ||
    path.startsWith(`${INSTITUTION_ROUTE_PREFIX}/`)
  );
}

/**
 * Stamp the durable anonymous-player cookie onto whichever response this
 * request produces, unless it already carries a valid one. Runs in
 * middleware (this app's own origin, ahead of any client JS) so the id is
 * a server-set cookie with an explicit Max-Age, not a client
 * `document.cookie` write on a session-scoped cookie.
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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (
    isMaintenanceModeEnabled() &&
    isGameRoute(path) &&
    path !== GAME_MAINTENANCE_PATH
  ) {
    return withAnonymousPlayerCookie(
      request,
      NextResponse.rewrite(new URL(GAME_MAINTENANCE_PATH, request.url), {
        status: SERVICE_UNAVAILABLE_STATUS,
      }),
    );
  }

  // Institution routes are gated by a NextAuth session (a signed JWT
  // cookie) with role "institution". Players never authenticate at all
  // (#738: no player login/registration, guest play only via campaign
  // link) — /login and /register are institution-only now, so there is
  // no separate "guest route" redirect logic left to run here.
  if (isInstitutionRoute(path)) {
    const session = await auth();
    if (session?.user?.role !== "institution") {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", path);
      return withAnonymousPlayerCookie(
        request,
        NextResponse.redirect(redirectUrl),
      );
    }
    // Self-serve replacement for #744's admin seed-script step (no admin
    // role/workflow exists in this project) — an institution account with
    // no slug yet must onboard before it can reach the dashboard.
    if (!session.user.institutionSlug && path !== ONBOARDING_PATH) {
      return withAnonymousPlayerCookie(
        request,
        NextResponse.redirect(new URL(ONBOARDING_PATH, request.url)),
      );
    }
    // Already onboarded — never show the name form again (back button,
    // stale tab), which would only end in a 403 "already onboarded".
    if (session.user.institutionSlug && path === ONBOARDING_PATH) {
      return withAnonymousPlayerCookie(
        request,
        NextResponse.redirect(new URL(INSTITUTION_ROUTE_PREFIX, request.url)),
      );
    }
    return withAnonymousPlayerCookie(request, NextResponse.next());
  }

  return withAnonymousPlayerCookie(request, NextResponse.next());
}

export const config = {
  matcher: ["/", "/login", "/register", "/institution/:path*", "/game/:path*"],
};
