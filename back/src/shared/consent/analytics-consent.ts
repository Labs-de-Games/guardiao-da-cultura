import type { Request } from "express";

/**
 * Analytics consent, as the browser reports it (issue #864).
 *
 * Kept in sync with front/src/lib/consent/consentStorage.ts —
 * CONSENT_COOKIE_NAME. The frontend keeps the full record (status, timestamp,
 * privacy-notice version) in localStorage and mirrors only this boolean to a
 * cookie, because a cookie is the one channel that reaches the backend on
 * every request, `sendBeacon` calls included.
 *
 * Fails closed: an absent, malformed or unparseable value is treated as "no
 * consent", so a player who has not chosen yet is never counted as having
 * agreed.
 */
export const ANALYTICS_CONSENT_COOKIE_NAME = "gp_analytics_consent";

export function isAnalyticsConsentGranted(value: unknown): boolean {
  return value === "1";
}

/** Reads the consent cookie off a request. Absent cookie-parser ⇒ false. */
export function readAnalyticsConsent(request: Request | undefined): boolean {
  return isAnalyticsConsentGranted(
    request?.cookies?.[ANALYTICS_CONSENT_COOKIE_NAME],
  );
}
