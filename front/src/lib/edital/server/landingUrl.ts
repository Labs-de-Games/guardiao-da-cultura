import "server-only";
import type { NextRequest } from "next/server";
import { serverEnv } from "../../env-server";

/**
 * The origin campaign links point at. AUTH_URL is the environment's
 * public origin — required and validated (origin only) outside
 * development, so staging and production each get their own domain.
 * Locally it's usually unset, and the request's own origin
 * (http://localhost:3000) is the right answer. Behind the staging/prod
 * proxy the request origin is the container's (http://0.0.0.0:3000), which
 * is why AUTH_URL must win there.
 */
export function resolveLandingBaseUrl(request: NextRequest): string {
  return serverEnv.server.authUrl ?? request.nextUrl.origin;
}
