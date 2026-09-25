/**
 * Durable anonymous-player identity.
 *
 * Replaces the session-scoped `gp_distinct_id` cookie (client-written, no
 * Max-Age, dies on browser close — the churn amplifier) with a
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

/**
 * Short-lived, non-identity marker: set by middleware alongside the durable
 * cookie ONLY on the request where it minted a brand-new id (never on a
 * request that already carried a valid one). Its only job is telling
 * client-side code "the cookie you're about to read was just freshly
 * generated, not a returning value" so the one-time legacy-id migration
 * below knows when it's actually safe to act.
 */
export const ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME =
  "gp_distinct_id_seeded";
export const ANONYMOUS_PLAYER_SEEDED_MARKER_MAX_AGE_SECONDS = 60;

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

const MIGRATION_MARKER_KEY = "gp_anon_id_migrated";

/**
 * One-time migration seed, per discovery §5.1: "Keep gp_fallback_guest_id
 * (localStorage) as a one-time migration seed into the cookie, never the
 * reverse — it cannot exist before hydration, so it can never be the
 * source of truth for the first capture."
 *
 * Middleware always sets the durable cookie before this JS runs, so by the
 * time we're here a cookie is basically always present — checking "does a
 * cookie already exist" can't tell a genuinely pre-existing id apart from
 * one middleware just minted this same request. `wasFreshlySeeded` (read
 * from the short-lived marker cookie middleware sets only when it mints a
 * new id) is what actually answers that. Only on that signal does an
 * existing player with a legacy `gp_fallback_guest_id` in localStorage (from
 * before this fix shipped) get that value promoted into the durable cookie,
 * instead of silently losing continuity to the brand-new random id
 * middleware just picked. Runs at most once per browser (guarded by a
 * localStorage marker) — a deliberate, narrow exception to "never a client
 * identity write", not a pattern to repeat.
 */
export function migrateLegacyGuestIdToCookie(
  legacyId: string | null,
  wasFreshlySeeded: boolean,
): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(MIGRATION_MARKER_KEY)) return;
  window.localStorage.setItem(MIGRATION_MARKER_KEY, "1");

  if (!wasFreshlySeeded) return;
  if (!isValidAnonymousPlayerId(legacyId)) return;

  document.cookie = [
    `${ANONYMOUS_PLAYER_COOKIE_NAME}=${legacyId}`,
    `Max-Age=${ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS}`,
    "path=/",
    "SameSite=Lax",
  ].join("; ");
}

/** Client-side read of the short-lived "was this cookie freshly minted?" marker. */
export function wasAnonymousPlayerCookieFreshlySeeded(): boolean {
  if (typeof document === "undefined") return false;
  const parsed = parseCookies(document.cookie);
  return parsed[ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME] === "1";
}
