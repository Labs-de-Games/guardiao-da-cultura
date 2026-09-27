import type posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import type { PostHogStub } from "../posthogStub";
import { getEventContext } from "./eventContext";

type PostHogLike = Pick<
  typeof posthog | PostHogStub,
  "get_property" | "get_distinct_id"
>;

/**
 * The total, never-throwing backstop half of the property-injection design.
 * `register()` covers the common path for stable properties; this stamps the per-event
 * properties (issue #740's own table: `session_id`, `event_name`,
 * `event_timestamp`, `chapter_id`) plus a backstop for `anonymous_player_id`,
 * `campaign_source` and `environment` onto ANY event that reaches send — including the
 * 31 game-code call sites that import the posthog-js singleton directly
 * and bypass the provider entirely, and library-internal events
 * (`$pageview`, `$web_vitals`, `$dead_click`, `$exception`) that never go
 * through our own capture code.
 *
 * Every assignment is guarded by `== null` / falsy checks — an explicit
 * value from the call site always wins, this only fills gaps.
 *
 * Deliberately does NOT rename events or fan one event into two — PostHog
 * cannot return two events from `before_send`, and silent rewriting makes
 * the live-events view useless for verification. Dual-emit stays explicit
 * at the call site (see #741).
 */
export function createBeforeSend(
  client: PostHogLike,
  options: { environment?: string } = {},
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

      // Staging and production share one PostHog project; an event that
      // escaped register() without `environment` would be unattributable.
      if (!properties.environment) {
        const environment =
          client.get_property("environment") ?? options.environment;
        if (typeof environment === "string" && environment.length > 0) {
          properties.environment = environment;
        }
      }

      // Mirrored from PostHog's own autocaptured properties, never
      // re-derived — see issue #740's table.
      if (properties.session_id == null && properties.$session_id != null) {
        properties.session_id = properties.$session_id;
      }
      if (properties.device_type == null && properties.$device_type != null) {
        properties.device_type = properties.$device_type;
      }

      if (properties.event_name == null && event.event) {
        properties.event_name = event.event;
      }
      if (properties.event_timestamp == null) {
        properties.event_timestamp = (
          event.timestamp ?? new Date()
        ).toISOString();
      }

      if (properties.chapter_id == null) {
        const chapterId = getEventContext().chapterId;
        if (chapterId != null) {
          properties.chapter_id = chapterId;
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
