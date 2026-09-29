import type posthog from "posthog-js";
import type { PostHogStub } from "../posthogStub";

/**
 * Canonical edital funnel event names (interim, per
 * docs/en/specs/edital-onepager.md — pending the real onepager, #739). Kept
 * as a single named export so call sites reference one source of truth
 * instead of retyping string literals across `Game.ts`/`QuizManager.ts`/
 * `PlayLanding.tsx` (#741 wires these to actual capture sites).
 */
export const EDITAL_EVENTS = {
  LANDING_PAGE_VIEWED: "landing_page_viewed",
  PLAY_CLICKED: "play_clicked",
  GAMEPLAY_STARTED: "gameplay_started",
  CHAPTER_1_STARTED: "chapter_1_started",
  QUIZ_STARTED: "quiz_started",
  QUIZ_COMPLETED: "quiz_completed",
  CHAPTER_1_COMPLETED: "chapter_1_completed",
} as const;

/**
 * `chapter_id` value for a given level number — the property
 * `before_send` (beforeSend.ts) stamps from lib/posthog/eventContext.ts's
 * singleton. Game code calls `setChapterId(chapterIdFor(levelNumber))`
 * when a chapter starts/ends.
 */
export function chapterIdFor(levelNumber: number): string {
  return `chapter_${levelNumber}`;
}

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
