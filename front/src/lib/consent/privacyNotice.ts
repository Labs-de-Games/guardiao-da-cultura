/**
 * Version of the privacy notice the player agreed to.
 *
 * Stored alongside every consent record so a future revision of the notice can
 * tell which players decided under which text. Bump this (to the publication
 * date of the new text) whenever the wording in `/privacidade` changes
 * materially — a bump does not re-prompt anyone on its own, that is a separate
 * product decision.
 */
export const PRIVACY_NOTICE_VERSION = "2026-09-28";

/** Route of the privacy notice, linked from the banner and the settings panel. */
export const PRIVACY_NOTICE_PATH = "/privacidade";
