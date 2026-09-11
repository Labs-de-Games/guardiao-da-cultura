import type posthog from "posthog-js";
import type { PostHogStub } from "../posthogStub";

/**
 * `anonymous_player_created` marks the moment a durable identity is minted
 * for a browser — fired at most once per browser, exactly when the
 * freshly-seeded marker (see lib/edital/anonymousPlayer.ts) says middleware
 * just minted the cookie for the first time. This is the counter-signal
 * discovery's done-when criteria for #740 check against: three hard
 * reloads must leave distinct_id unchanged with exactly one
 * anonymous_player_created, never one per reload.
 */
export const ANONYMOUS_PLAYER_CREATED_EVENT = "anonymous_player_created";

const SENT_MARKER_KEY = "gp_anonymous_player_created_sent";

type PostHogLike = Pick<typeof posthog | PostHogStub, "capture">;

export function captureAnonymousPlayerCreatedOnce(
  client: PostHogLike,
  wasFreshlySeeded: boolean,
): void {
  if (typeof window === "undefined") return;
  if (!wasFreshlySeeded) return;
  if (window.localStorage.getItem(SENT_MARKER_KEY)) return;

  window.localStorage.setItem(SENT_MARKER_KEY, "1");
  client.capture(ANONYMOUS_PLAYER_CREATED_EVENT);
}
