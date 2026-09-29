import type posthog from "posthog-js";
import type { PostHogStub } from "../posthogStub";

/**
 * The non-standard UTM key #746's campaign links use
 * (`?utm_institution=<slug>`). posthog-js already auto-captures the
 * standard `utm_*` params as super properties (last-touch, overwritten on
 * every visit); this module
 * only handles the *first-touch* rule for the non-standard key, which
 * posthog-js's own `custom_campaign_params` config does NOT make
 * first-touch by itself — it only tells posthog-js to also read this key.
 */
export const CAMPAIGN_SOURCE_PROPERTY = "campaign_source";
export const INSTITUTION_UTM_PARAM = "utm_institution";

/**
 * Turma (class) attribution — issue #807. `utm_source` is already
 * auto-captured by posthog-js as a last-touch super property (overwritten
 * on every visit with a different value), which is the wrong guarantee
 * for "which turma this player belongs to": a student who reopens the
 * class link later, or arrives via a different/organic link after their
 * first visit, would silently fall out of their turma's numbers. This
 * mirrors `applyFirstTouchCampaignSource` below to give turma attribution
 * the same first-touch, sticky guarantee institution attribution already
 * has — required before #807's per-turma metrics can be trusted.
 */
export const TURMA_SOURCE_PROPERTY = "turma_source";
export const TURMA_UTM_PARAM = "utm_source";

/**
 * How this device first entered the game — issue #851. `campaign_source`
 * alone can't answer that: it is only ever registered once a link is
 * used, so its absence means "no link yet", not "entered directly", and a
 * player who first played directly and later opened an institution link
 * ended up with events of both origins. `entry_origin` locks the origin
 * on the very first visit, whichever it is, and is never overwritten.
 */
export const ENTRY_ORIGIN_PROPERTY = "entry_origin";
export const ENTRY_ORIGIN_DIRECT = "direct";
export const ENTRY_ORIGIN_INSTITUTIONAL = "institutional";

/**
 * Mirrors the slug format later formalized as ORIGIN_SLUG_PATTERN in
 * lib/edital/origins.ts (#746) — lowercase letters, digits, single
 * hyphens, no leading/trailing/double hyphen. Duplicated here (not
 * imported) because that module doesn't exist yet at this point in the
 * epic; keep both patterns in sync if either changes.
 *
 * Required by issue #740: "Sanitizar todo slug contra ORIGIN_SLUG_PATTERN,
 * para um link envenenado não injetar cardinalidade alta em
 * campaign_source." Without this, `?utm_institution=<anything>` gets
 * written verbatim and permanently (first-touch) onto every event.
 */
const CAMPAIGN_SOURCE_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CAMPAIGN_SOURCE_MAX_LENGTH = 100;

function isValidCampaignSourceSlug(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= CAMPAIGN_SOURCE_MAX_LENGTH &&
    CAMPAIGN_SOURCE_SLUG_PATTERN.test(value)
  );
}

type PostHogLike = Pick<
  typeof posthog | PostHogStub,
  "get_property" | "register"
>;

/**
 * First-touch entry origin (#851): on the first visit of this device,
 * registers `institutional` if the URL carries a valid `utm_institution`
 * and `direct` otherwise (an invalid slug is never attributed, so it
 * counts as direct). Does nothing once an origin is registered. Must run
 * before `applyFirstTouchCampaignSource`, which reads it.
 *
 * A device that already carries a `campaign_source` (attributed before
 * `entry_origin` existed) entered through a link, whatever the current
 * URL says — so it is registered `institutional`, never `direct`.
 */
export function applyFirstTouchEntryOrigin(
  client: PostHogLike,
  searchParams: URLSearchParams,
): void {
  const existing = client.get_property(ENTRY_ORIGIN_PROPERTY);
  if (typeof existing === "string" && existing.length > 0) {
    return;
  }

  const campaignSource = client.get_property(CAMPAIGN_SOURCE_PROPERTY);
  if (typeof campaignSource === "string" && campaignSource.length > 0) {
    client.register({ [ENTRY_ORIGIN_PROPERTY]: ENTRY_ORIGIN_INSTITUTIONAL });
    return;
  }

  const utmInstitution = searchParams.get(INSTITUTION_UTM_PARAM);
  const entryOrigin =
    utmInstitution && isValidCampaignSourceSlug(utmInstitution)
      ? ENTRY_ORIGIN_INSTITUTIONAL
      : ENTRY_ORIGIN_DIRECT;

  client.register({ [ENTRY_ORIGIN_PROPERTY]: entryOrigin });
}

/**
 * First-touch attribution: if `utm_institution` is present in the current
 * URL and no `campaign_source` has been registered yet on this device,
 * register it as a super property (persisted via posthog-js's own
 * localStorage-backed `register()`, so it survives sessions on the same
 * device). Does nothing on a later visit with a different or absent
 * `utm_institution` — the whole point of first-touch is that it does not
 * get overwritten (discovery §5.1, "a later visit with a different
 * utm_source does not overwrite first-touch").
 *
 * A device whose first entry was direct (#851) never gets a
 * `campaign_source`: a later institution link must not move a player
 * from "direct" into that institution's numbers.
 */
export function applyFirstTouchCampaignSource(
  client: PostHogLike,
  searchParams: URLSearchParams,
): void {
  const existing = client.get_property(CAMPAIGN_SOURCE_PROPERTY);
  if (typeof existing === "string" && existing.length > 0) {
    return;
  }

  if (client.get_property(ENTRY_ORIGIN_PROPERTY) === ENTRY_ORIGIN_DIRECT) {
    return;
  }

  const utmInstitution = searchParams.get(INSTITUTION_UTM_PARAM);
  if (!utmInstitution || !isValidCampaignSourceSlug(utmInstitution)) {
    return;
  }

  client.register({ [CAMPAIGN_SOURCE_PROPERTY]: utmInstitution });
}

/**
 * Same first-touch rule as `applyFirstTouchCampaignSource`, for the
 * turma/class dimension: once `turma_source` is registered on this
 * device, a later visit with a different or absent `utm_source` never
 * overwrites it. Independent of `campaign_source` — a player can be
 * first-touch attributed to an institution and a turma on different
 * visits (e.g. institution link first, class link later), each locking
 * in separately.
 *
 * Same #851 guard as `applyFirstTouchCampaignSource`: a device whose
 * first entry was direct never gets a `turma_source` either, so a later
 * class link can't make its turma count as active.
 */
export function applyFirstTouchTurmaSource(
  client: PostHogLike,
  searchParams: URLSearchParams,
): void {
  const existing = client.get_property(TURMA_SOURCE_PROPERTY);
  if (typeof existing === "string" && existing.length > 0) {
    return;
  }

  if (client.get_property(ENTRY_ORIGIN_PROPERTY) === ENTRY_ORIGIN_DIRECT) {
    return;
  }

  const utmSource = searchParams.get(TURMA_UTM_PARAM);
  if (!utmSource || !isValidCampaignSourceSlug(utmSource)) {
    return;
  }

  client.register({ [TURMA_SOURCE_PROPERTY]: utmSource });
}
