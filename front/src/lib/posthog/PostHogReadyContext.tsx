"use client";

import { createContext, type ReactNode, useContext } from "react";

/**
 * Whether a `capture()` will actually be sent — i.e. `posthog.init()` has run
 * and `registerEventContext` has stamped the event context.
 *
 * Deliberately **not** "the player consented" (issue #899). Consent flips one
 * commit too early for anything below `PostHogProvider`: React flushes passive
 * effects child-first, so a descendant's effect reacting to `consentState` runs
 * *before* the provider's own init effect, and posthog-js drops a pre-init
 * capture instead of queueing it. That is what lost `landing_page_viewed` — the
 * funnel's first step — for every player, including those who had already
 * accepted. A signal set after `init()` is the only one a descendant can react
 * to safely.
 *
 * Only capture sites that fire on mount need this. Anything triggered by a
 * player action (a click, a Phaser scene behind `ConsentGuard`) happens long
 * after init and can keep using the singleton directly.
 */
const PostHogReadyContext = createContext(false);

export function PostHogReadyProvider({
  children,
  ready,
}: {
  children: ReactNode;
  ready: boolean;
}) {
  return (
    <PostHogReadyContext.Provider value={ready}>
      {children}
    </PostHogReadyContext.Provider>
  );
}

export function usePostHogReady(): boolean {
  return useContext(PostHogReadyContext);
}
