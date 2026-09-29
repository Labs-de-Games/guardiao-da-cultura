import type { Request } from "express";

/**
 * Analytics consent, as the browser reports it (issue #864).
 *
 * Kept in sync with front/src/lib/consent/consentStorage.ts —
 * CONSENT_COOKIE_NAME — and front/src/lib/consent/privacyNotice.ts —
 * RECONSENT_REQUIRED_FROM. The frontend keeps the full record (status,
 * timestamp, privacy-notice version) in localStorage and mirrors the decision
 * to this cookie, because a cookie is the one channel that reaches the backend
 * on every request, `sendBeacon` calls included.
 *
 * Fails closed: an absent, malformed or unparseable value is treated as "no
 * consent", so a player who has not chosen yet is never counted as having
 * agreed.
 */
export const ANALYTICS_CONSENT_COOKIE_NAME = "gp_analytics_consent";

/**
 * The oldest privacy-notice version that still counts as valid consent.
 *
 * MUST match RECONSENT_REQUIRED_FROM in
 * front/src/lib/consent/privacyNotice.ts. Bumping it on both sides is what
 * retires every acceptance taken under an older text — the backend stops
 * honouring those cookies on the very next request, without waiting for the
 * client to notice and rewrite them.
 */
export const RECONSENT_REQUIRED_FROM = "2026-09-28";

/**
 * The notice version the frontend currently stamps on new decisions.
 *
 * MUST match PRIVACY_NOTICE_VERSION in
 * front/src/lib/consent/privacyNotice.ts. Mirrored here only so this side can
 * apply the same clamp as `reconsentThreshold()` there — without it, a
 * threshold bumped past the published notice would leave the frontend
 * (clamped, so it sends) and the backend (unclamped, so it discards)
 * disagreeing, and every event would vanish silently.
 */
export const PRIVACY_NOTICE_VERSION = "2026-09-28";

/** Never demand consent to a notice that has not been published. */
function reconsentThreshold(): string {
  return RECONSENT_REQUIRED_FROM <= PRIVACY_NOTICE_VERSION
    ? RECONSENT_REQUIRED_FROM
    : PRIVACY_NOTICE_VERSION;
}

const NOTICE_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts `"1:<notice-version>"`, e.g. `"1:2026-09-28"`.
 *
 * A bare `"1"` — the format written before the notice version was mirrored
 * here — carries no version and is refused. That is the intended reading
 * rather than a compatibility break: it predates the notice the player would
 * be shown today, so it is exactly the case that needs re-asking.
 */
export function isAnalyticsConsentGranted(value: unknown): boolean {
  if (typeof value !== "string") return false;

  const separator = value.indexOf(":");
  if (separator === -1) return false;
  if (value.slice(0, separator) !== "1") return false;

  const noticeVersion = value.slice(separator + 1);
  if (!NOTICE_VERSION_PATTERN.test(noticeVersion)) return false;

  return noticeVersion >= reconsentThreshold();
}

/** Reads the consent cookie off a request. Absent cookie-parser ⇒ false. */
export function readAnalyticsConsent(request: Request | undefined): boolean {
  return isAnalyticsConsentGranted(
    request?.cookies?.[ANALYTICS_CONSENT_COOKIE_NAME],
  );
}
