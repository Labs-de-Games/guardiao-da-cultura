import type posthog from "posthog-js";
import { applyFirstTouchCampaignSource } from "../edital/campaign";
import type { PostHogStub } from "../posthogStub";

type PostHogLike = Pick<
  typeof posthog | PostHogStub,
  "get_property" | "register"
>;

/**
 * Stable-property injection via `register()`, called once from the
 * PostHog client's `loaded:` callback. This is the "for stable properties"
 * half of the two-mechanism design in
 * docs/specs/discovery-738-dashboard-edital.md §5.3 — `before_send`
 * (lib/posthog/beforeSend.ts) is the separate, never-throwing backstop
 * for anything `register()` misses.
 */
export function registerEventContext(
  client: PostHogLike,
  options: {
    environment: string;
    searchParams: URLSearchParams;
  },
): void {
  client.register({ environment: options.environment });
  applyFirstTouchCampaignSource(client, options.searchParams);
}
