import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "./auth.config";

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

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const authStatus = request.cookies.get(AUTH_STATUS_COOKIE_NAME)?.value;
  const isAuthenticated = authStatus === "authenticated";
  const guestPlayEnabled =
    request.cookies.get(GUEST_PLAY_COOKIE_NAME)?.value === "1";

  // Institution routes are gated by a NextAuth session (a signed JWT
  // cookie) with role "institution" — not the legacy, forgeable
  // `auth_status` string. Admin stays on the legacy path for now (issue
  // #744's "Coexistência" section); the two auth systems are deliberately
  // kept on non-overlapping route ownership so they never have to agree
  // with each other.
  if (isInstitutionRoute(path)) {
    const session = await auth();
    if (session?.user?.role !== "institution") {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  }

  if (isProtectedRoute(path) && !isAuthenticated && !guestPlayEnabled) {
    const redirectUrl = new URL("/register", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isGuestRoute(path) && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
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
  ],
};
