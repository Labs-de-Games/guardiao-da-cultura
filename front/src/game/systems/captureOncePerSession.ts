import posthog from "posthog-js";

const SESSION_ONCE_PREFIX = "gp_session_once_";

/**
 * Fires a PostHog capture at most once per browser session (sessionStorage
 * guard, cleared on tab close — the right lifetime for "once per
 * playthrough", unlike localStorage). Used for canonical funnel events
 * whose underlying legacy event fires more often than once per session —
 * e.g. `game_started` fires once per level (scene restart per
 * `LevelCinematic.ts`), but the canonical `gameplay_started` funnel step
 * must fire exactly once.
 *
 * Falls back to firing unconditionally if sessionStorage is unavailable
 * (e.g. private-browsing edge cases) rather than silently dropping the
 * event.
 */
export function captureOncePerSession(
  eventName: string,
  properties?: Record<string, unknown>,
): void {
  if (typeof sessionStorage === "undefined") {
    posthog.capture(eventName, properties);
    return;
  }

  const key = `${SESSION_ONCE_PREFIX}${eventName}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  posthog.capture(eventName, properties);
}
