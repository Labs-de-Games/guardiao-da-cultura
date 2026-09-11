import type posthog from "posthog-js";
import type { PostHogStub } from "../posthogStub";

/**
 * The non-standard UTM key #746's campaign links use
 * (`?utm_institution=<slug>`), per docs/specs/discovery-738-dashboard-edital.md
 * §3.1. posthog-js already auto-captures the standard `utm_*` params as
 * super properties (last-touch, overwritten on every visit); this module
 * only handles the *first-touch* rule for the non-standard key, which
 * posthog-js's own `custom_campaign_params` config does NOT make
 * first-touch by itself — it only tells posthog-js to also read this key.
 */
export const CAMPAIGN_SOURCE_PROPERTY = "campaign_source";
export const INSTITUTION_UTM_PARAM = "utm_institution";

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
 * First-touch attribution: if `utm_institution` is present in the current
 * URL and no `campaign_source` has been registered yet on this device,
 * register it as a super property (persisted via posthog-js's own
 * localStorage-backed `register()`, so it survives sessions on the same
 * device). Does nothing on a later visit with a different or absent
 * `utm_institution` — the whole point of first-touch is that it does not
 * get overwritten (discovery §5.1, "a later visit with a different
 * utm_source does not overwrite first-touch").
 */
export function applyFirstTouchCampaignSource(
  client: PostHogLike,
  searchParams: URLSearchParams,
): void {
  const existing = client.get_property(CAMPAIGN_SOURCE_PROPERTY);
  if (typeof existing === "string" && existing.length > 0) {
    return;
  }

  const utmInstitution = searchParams.get(INSTITUTION_UTM_PARAM);
  if (!utmInstitution || !isValidCampaignSourceSlug(utmInstitution)) {
    return;
  }

  client.register({ [CAMPAIGN_SOURCE_PROPERTY]: utmInstitution });
}
