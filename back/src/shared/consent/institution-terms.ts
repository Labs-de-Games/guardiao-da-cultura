/**
 * Terms of Use an institution must accept before it can register (issue #338).
 *
 * A different consent from the player's analytics banner in
 * `./analytics-consent.ts`, and deliberately so: that one is an *optional*
 * permission given by an anonymous browser and stored in a cookie, this one is
 * a *mandatory* agreement made by an identified account and stored in Postgres.
 * They share only the ISO-date versioning convention.
 *
 * MUST match INSTITUTION_TERMS_VERSION in
 * front/src/lib/consent/institutionTerms.ts. There is no shared package
 * between front and back, so this is hand-mirrored — the same deliberate
 * duplication already documented for INSTITUTION_SLUG_PATTERN and for the
 * analytics notice constants.
 */
export const INSTITUTION_TERMS_VERSION = "2026-09-28";

/**
 * The oldest accepted version that still counts as valid consent.
 *
 * Separate from `INSTITUTION_TERMS_VERSION` for the same reason the analytics
 * notice splits its two constants: *which text did they accept* and *is that
 * text still good enough* are different questions. Correcting a typo bumps only
 * the version and nobody is interrupted; changing an actual obligation is a
 * material revision, and bumping this constant to match locks every institution
 * out of the dashboard until they accept the new text.
 *
 * Without this split a one-character fix would do the latter.
 *
 * MUST match TERMS_RECONSENT_REQUIRED_FROM in
 * front/src/lib/consent/institutionTerms.ts.
 */
export const TERMS_RECONSENT_REQUIRED_FROM = "2026-09-28";

const TERMS_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The threshold actually applied, never newer than the text on offer.
 *
 * Demanding a version that has not been published would be unsatisfiable:
 * accepting stamps the record with `INSTITUTION_TERMS_VERSION`, which would
 * still fall short, so every institution would bounce between the dashboard and
 * the terms page forever. Clamping turns that into a no-op.
 */
function reconsentThreshold(): string {
  return TERMS_RECONSENT_REQUIRED_FROM <= INSTITUTION_TERMS_VERSION
    ? TERMS_RECONSENT_REQUIRED_FROM
    : INSTITUTION_TERMS_VERSION;
}

/**
 * Whether an already-recorded acceptance still stands.
 *
 * Fails closed: a version that is not a well-formed date — written by a much
 * older build, or hand-edited — is treated as stale, because asking again is
 * the safe direction and assuming consent is not.
 */
export function isTermsVersionStale(version: string): boolean {
  if (!TERMS_VERSION_PATTERN.test(version)) return true;
  return version < reconsentThreshold();
}

/**
 * Whether a client-supplied version is the text currently on offer.
 *
 * The client sends back the version it actually rendered, and a mismatch is
 * refused rather than quietly re-stamped: a tab left open across a deploy would
 * otherwise record an acceptance of wording the user was never shown, which is
 * precisely the claim the stored record exists to support.
 *
 * Fails closed on anything that is not a well-formed date, so a malformed or
 * absent value can never satisfy the gate.
 */
export function isCurrentTermsVersion(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (!TERMS_VERSION_PATTERN.test(value)) return false;
  return value === INSTITUTION_TERMS_VERSION;
}
