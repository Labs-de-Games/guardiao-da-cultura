/**
 * Version of the privacy notice the player agreed to.
 *
 * Stored alongside every consent record so a revision of the notice can tell
 * which players decided under which text. Bump this (to the publication date of
 * the new text) whenever the wording in `/privacidade` changes at all —
 * including corrections too small to be worth re-asking about.
 */
export const PRIVACY_NOTICE_VERSION = "2026-09-29";

/**
 * The oldest notice version that still counts as valid consent.
 *
 * Deliberately separate from `PRIVACY_NOTICE_VERSION` so the two questions stay
 * independent: *which text did they see* versus *is that text still good
 * enough*. Fixing a typo bumps only the version and nobody is interrupted;
 * adding a vendor, a purpose, or a new destination for the data is a material
 * change, and bumping this constant to match forces every player who accepted
 * under an older text back through the gate before anything else is collected.
 *
 * Both constants are ISO `YYYY-MM-DD` dates, so a lexicographic `<` is also a
 * chronological one.
 */
export const RECONSENT_REQUIRED_FROM = "2026-09-28";

/** Route of the privacy notice, linked from the banner and the settings panel. */
export const PRIVACY_NOTICE_PATH = "/privacidade";

const NOTICE_VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The threshold actually applied, never newer than the text on offer.
 *
 * Demanding consent to a notice version that has not been published is a
 * configuration error with no valid answer: accepting stamps the record with
 * `PRIVACY_NOTICE_VERSION`, which would still fall short, so the record is born
 * stale, the gate re-renders unchanged, and the accept button looks dead while
 * the game stays unmountable. Clamping turns a bricked game into a no-op, and
 * the warning below says which constant was forgotten.
 *
 * The two constants are meant to move together for a material revision; this
 * only catches bumping the threshold alone.
 */
function reconsentThreshold(): string {
  if (RECONSENT_REQUIRED_FROM <= PRIVACY_NOTICE_VERSION) {
    return RECONSENT_REQUIRED_FROM;
  }

  if (process.env.NODE_ENV !== "production") {
    console.error(
      `[consent] RECONSENT_REQUIRED_FROM (${RECONSENT_REQUIRED_FROM}) is newer ` +
        `than PRIVACY_NOTICE_VERSION (${PRIVACY_NOTICE_VERSION}). No player ` +
        `could ever satisfy it, so it is being ignored. Bump ` +
        `PRIVACY_NOTICE_VERSION to match — a material revision moves both.`,
    );
  }

  return PRIVACY_NOTICE_VERSION;
}

/**
 * A notice version rendered for a Brazilian player: `2026-09-29` → `29/09/2026`.
 *
 * Formatted from the string's own parts rather than through `Date`, which would
 * read a bare `YYYY-MM-DD` as UTC midnight and then render it one day earlier
 * everywhere in Brazil (UTC-3) — an off-by-one on the exact date being shown.
 *
 * A version that is not a well-formed date is returned untouched: the stored
 * value is the honest thing to show, and `isNoticeVersionStale` has already
 * decided such a record cannot count as consent anyway.
 */
export function formatNoticeVersion(noticeVersion: string): string {
  if (!NOTICE_VERSION_PATTERN.test(noticeVersion)) return noticeVersion;
  const [year, month, day] = noticeVersion.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Whether a decision taken under `noticeVersion` is too old to still stand.
 *
 * Fails closed: a version that is not a well-formed date — hand-edited, written
 * by a much older build, or corrupted — is treated as stale, because asking
 * again is the safe direction and assuming consent is not.
 */
export function isNoticeVersionStale(noticeVersion: string): boolean {
  if (!NOTICE_VERSION_PATTERN.test(noticeVersion)) return true;
  return noticeVersion < reconsentThreshold();
}
