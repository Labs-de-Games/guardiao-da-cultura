"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePostHogReady } from "@/lib/posthog/PostHogReadyContext";

function PostHogPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const posthogReady = usePostHogReady();
  // By value, not by object identity: `useSearchParams()` returns a fresh
  // URLSearchParams whenever its caller re-renders without navigating, and an
  // object in the dependency array turns every such render into a duplicate
  // pageview. The query string is what the event actually carries.
  const query = searchParams.toString();

  useEffect(() => {
    // `posthogReady` is a dependency, not just a guard: the pathname does not
    // change when the player accepts, so without it the very first pageview of
    // a consenting session would be the one that ran before init, and never be
    // sent again.
    //
    // Consent is the wrong signal for this and used to be the one used here
    // (issue #899). React flushes passive effects child-first, so this effect
    // re-runs on the consent flip *before* PostHogProvider's init effect in the
    // same commit — and `usePostHog()` offers no second chance, because the
    // client it hands back is the same singleton reference throughout, so the
    // dependency never changes. Readiness is set after init() and is the only
    // signal a descendant can react to safely.
    if (!posthogReady) return;
    if (pathname && posthog) {
      const url = window.origin + pathname + (query ? `?${query}` : "");
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, query, posthog, posthogReady]);

  return null;
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}
