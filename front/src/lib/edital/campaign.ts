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
  if (!utmInstitution) {
    return;
  }

  client.register({ [CAMPAIGN_SOURCE_PROPERTY]: utmInstitution });
}
