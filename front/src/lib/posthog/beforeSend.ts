import type posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import type { PostHogStub } from "../posthogStub";

type PostHogLike = Pick<
  typeof posthog | PostHogStub,
  "get_property" | "get_distinct_id"
>;

/**
 * The total, never-throwing backstop half of the property-injection design
 * (docs/specs/discovery-738-dashboard-edital.md §5.3). `register()` covers
 * the common path; this stamps `anonymous_player_id` and `campaign_source`
 * onto ANY event that reaches send — including the 31 game-code call sites
 * that import the posthog-js singleton directly and bypass the provider
 * entirely, and library-internal events (`$pageview`, `$web_vitals`,
 * `$dead_click`, `$exception`) that never go through our own capture code.
 *
 * Deliberately does NOT rename events or fan one event into two — PostHog
 * cannot return two events from `before_send`, and silent rewriting makes
 * the live-events view useless for verification. Dual-emit stays explicit
 * at the call site (see #741).
 */
export function createBeforeSend(
  client: PostHogLike,
): (event: CaptureResult | null) => CaptureResult | null {
  return (event) => {
    try {
      if (!event) {
        return event;
      }

      const properties = { ...event.properties };

      if (!properties.anonymous_player_id) {
        const distinctId = client.get_distinct_id();
        if (typeof distinctId === "string" && distinctId.length > 0) {
          properties.anonymous_player_id = distinctId;
        }
      }

      if (!properties.campaign_source) {
        const campaignSource = client.get_property("campaign_source");
        if (typeof campaignSource === "string" && campaignSource.length > 0) {
          properties.campaign_source = campaignSource;
        }
      }

      return { ...event, properties };
    } catch {
      // Never throw from before_send — a broken backstop must not drop
      // the event it was trying to enrich.
      return event;
    }
  };
}
