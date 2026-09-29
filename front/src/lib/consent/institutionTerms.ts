/**
 * Terms of Use an institution must accept before it can register (issue #338).
 *
 * A different consent from the player's analytics notice in `./privacyNotice.ts`,
 * and deliberately so: that one is an *optional* permission given by an
 * anonymous browser and kept in localStorage, this one is a *mandatory*
 * agreement made by an identified account and kept in Postgres. They share the
 * ISO-date versioning convention and `formatNoticeVersion`, nothing else —
 * neither the storage module nor the consent context applies here.
 *
 * MUST match INSTITUTION_TERMS_VERSION in
 * back/src/shared/consent/institution-terms.ts. Hand-mirrored: there is no
 * shared package between front and back, the same deliberate duplication
 * already documented for INSTITUTION_SLUG_PATTERN.
 */
export const INSTITUTION_TERMS_VERSION = "2026-09-28";

/**
 * The oldest accepted version that still counts as valid consent.
 *
 * Split from the version above for the reason `privacyNotice.ts` documents:
 * correcting a typo should bump only the version and interrupt nobody, while a
 * material revision bumps both and sends every institution back through the
 * gate. Without the split, a one-character fix would lock every institution out
 * of the dashboard until it re-accepted.
 *
 * MUST match TERMS_RECONSENT_REQUIRED_FROM in
 * back/src/shared/consent/institution-terms.ts — the backend is the side that
 * actually enforces it.
 */
export const TERMS_RECONSENT_REQUIRED_FROM = "2026-09-28";

/** Route of the Terms of Use, linked from every acceptance checkbox. */
export const INSTITUTION_TERMS_PATH = "/termos";
