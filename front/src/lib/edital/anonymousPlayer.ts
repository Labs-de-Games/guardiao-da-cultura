/**
 * Durable anonymous-player identity.
 *
 * Replaces the session-scoped `gp_distinct_id` cookie (client-written, no
 * Max-Age, dies on browser close — the churn amplifier identified in
 * docs/specs/discovery-738-dashboard-edital.md §3.1/§5.1) with a
 * server-set cookie carrying an explicit Max-Age. "Server-set" here means
 * set by Next.js middleware (front's own origin), not written by client JS
 * via `document.cookie` on every render.
 *
 * Why both a cookie and a query parameter (see discovery §5.1):
 * - The cookie alone breaks in local dev: `localhost:3000` -> `:3001` is
 *   cross-site, and a `SameSite=Lax` cookie is not sent on XHR there.
 * - The query parameter alone cannot fix `sendBeacon` (analyticsApi.ts),
 *   which cannot set headers but does send cookies.
 * Backend precedence is `user?.id ?? cookie ?? validated query ?? randomUUID()`.
 */

export const ANONYMOUS_PLAYER_COOKIE_NAME = "gp_distinct_id";

/** ~400 days — the longest Max-Age Chrome will honor without truncation. */
export const ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/** Backend also validates this; keep both bounds in sync. */
export const ANONYMOUS_PLAYER_ID_MAX_LENGTH = 200;

/**
 * A conservative charset for an identifier that travels as both a cookie
 * value and a URL query parameter: UUID-like tokens only. Anything else is
 * treated as invalid and never forwarded.
 */
const ANONYMOUS_PLAYER_ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;

export function isValidAnonymousPlayerId(
  value: string | null | undefined,
): value is string {
  if (!value) return false;
  if (value.length > ANONYMOUS_PLAYER_ID_MAX_LENGTH) return false;
  return ANONYMOUS_PLAYER_ID_PATTERN.test(value);
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/** Client-side read only — for use in browser code (e.g. before a fetch). */
export function readAnonymousPlayerIdFromDocumentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const parsed = parseCookies(document.cookie);
  const value = parsed[ANONYMOUS_PLAYER_COOKIE_NAME];
  return isValidAnonymousPlayerId(value) ? value : null;
}

function generateAnonymousPlayerId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Edge runtime and all modern browsers have crypto.randomUUID; this is a
  // last-resort fallback only, not expected to run in practice.
  return `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export { generateAnonymousPlayerId };
