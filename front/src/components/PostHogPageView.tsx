"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { useConsent } from "@/lib/consent/ConsentContext";

function PostHogPageViewInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const { state: consentState } = useConsent();

  useEffect(() => {
    // `consentState` is a dependency, not just a guard: the pathname does not
    // change when the player accepts, so without it the very first pageview
    // of a consenting session would be the one that ran (and was dropped)
    // before init, and never be sent again.
    if (consentState !== "accepted") return;
    if (pathname && posthog) {
      const url =
        window.origin +
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog, consentState]);

  return null;
}

export default function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageViewInner />
    </Suspense>
  );
}
