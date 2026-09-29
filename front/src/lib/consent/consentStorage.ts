/**
 * Analytics-consent record (issue #864).
 *
 * `localStorage` is the source of truth: it holds the full record the issue
 * asks for — status, when it was decided, and which version of the privacy
 * notice was on screen at the time. A cookie mirrors *only* the boolean,
 * because the NestJS backend also sends events to PostHog and a cookie is the
 * one channel that reaches it on every request, `sendBeacon` included (which
 * cannot set headers but does send cookies).
 *
 * Nothing here touches PostHog's own storage — see `clearPostHogStorage()` in
 * `posthogTeardown.ts` for that.
 */

import { ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS } from "../edital/anonymousPlayer";
import { isNoticeVersionStale, PRIVACY_NOTICE_VERSION } from "./privacyNotice";

export const CONSENT_STORAGE_KEY = "gameplate:analytics-consent:v1";

/** Read by the backend; only ever `"1"` or `"0"`. */
export const CONSENT_COOKIE_NAME = "gp_analytics_consent";

export type ConsentStatus = "accepted" | "declined";

export interface ConsentRecord {
  status: ConsentStatus;
  /** ISO 8601. */
  decidedAt: string;
  noticeVersion: string;
}

function isConsentRecord(value: unknown): value is ConsentRecord {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ConsentRecord>;
  return (
    (candidate.status === "accepted" || candidate.status === "declined") &&
    typeof candidate.decidedAt === "string" &&
    typeof candidate.noticeVersion === "string"
  );
}

/**
 * The player's decision, or `null` if they have not made one yet.
 *
 * `null` is what puts the banner on screen, so every failure mode — private
 * mode, a blocked store, a half-written or hand-edited value — deliberately
 * resolves to `null`: asking again is the safe direction, assuming consent is
 * not.
 */
export function readConsent(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isConsentRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Whether a stored decision has been outdated by a material revision of the
 * privacy notice.
 *
 * Only an *acceptance* can go stale. Someone who refused is already having
 * nothing collected, so there is no consent to refresh — re-asking them would
 * be nagging until they give in, not a new legal basis.
 */
export function isConsentStale(record: ConsentRecord | null): boolean {
  if (record?.status !== "accepted") return false;
  return isNoticeVersionStale(record.noticeVersion);
}

/**
 * The cookie carries the notice version, not just the boolean: `1:2026-09-28`.
 *
 * Without it the backend would have to wait for client JS to notice the record
 * went stale and flip the cookie, and would keep persisting events for every
 * request made in that window. With it, the backend reaches the same verdict
 * independently and on the very first request.
 *
 * A legacy value of plain `"1"` — written before versioning existed — therefore
 * carries no version and is read as stale. That is the intended reading: it
 * predates the notice the player would now be shown.
 */
function consentCookieValue(record: ConsentRecord): string {
  return record.status === "accepted" && !isConsentStale(record)
    ? `1:${record.noticeVersion}`
    : "0";
}

/**
 * Mirror a record to the cookie the backend reads.
 *
 * Also called on every load, not only on a decision: it refreshes the 400-day
 * `Max-Age` for players who keep coming back (localStorage never expires, so
 * without this the cookie half of the pair would eventually lapse on its own),
 * and it is what demotes a newly-stale acceptance to `0` immediately.
 */
export function syncConsentCookie(record: ConsentRecord): void {
  try {
    document.cookie =
      `${CONSENT_COOKIE_NAME}=${consentCookieValue(record)}; path=/; ` +
      `SameSite=Lax; Max-Age=${ANONYMOUS_PLAYER_COOKIE_MAX_AGE_SECONDS}`;
  } catch {
    // A blocked cookie jar only costs us backend gating, which fails closed:
    // no cookie is read as "no consent".
  }
}

/**
 * Persist a decision. Writes the full record to localStorage and mirrors the
 * boolean to the cookie the backend reads.
 */
export function writeConsent(status: ConsentStatus): ConsentRecord {
  const record: ConsentRecord = {
    status,
    decidedAt: new Date().toISOString(),
    noticeVersion: PRIVACY_NOTICE_VERSION,
  };

  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Private mode throws on write. The cookie below still carries the
    // decision for this browser session, and the banner reappears next visit
    // rather than silently assuming an answer.
  }

  syncConsentCookie(record);
  return record;
}

/**
 * Whether the player authorised usage-data collection.
 *
 * Plain function, not a hook, because the callers that need it most are
 * outside React: Phaser systems and the API modules under `lib/`. Anything
 * other than an explicit, still-current acceptance is false, so an undecided
 * player — and one whose acceptance predates a material revision of the notice
 * — is treated exactly like one who refused.
 */
export function hasAnalyticsConsent(): boolean {
  const record = readConsent();
  return record?.status === "accepted" && !isConsentStale(record);
}

/** Drop the stored decision entirely. For QA and tests. */
export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
  try {
    document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; Max-Age=0`;
  } catch {
    // Nothing to do.
  }
}
