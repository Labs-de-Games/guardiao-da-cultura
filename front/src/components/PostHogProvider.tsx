"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { PostHogStub } from "../lib/posthogStub";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<typeof posthog | PostHogStub | null>(
    null,
  );

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const env = process.env.NEXT_PUBLIC_ENV || "production";

    if (!key) {
      console.warn(
        "[PostHog] No key set. Using PostHogStub. Events will be logged to console only.",
      );
      setClient(new PostHogStub());
      return;
    }

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      opt_in_site_apps: env === "production",
      __add_tracing_headers: [],
      bootstrap: {
        distinctID: (window as unknown as Record<string, unknown>)
          .__POSTHOG_DISTINCT_ID__ as string,
        featureFlags:
          ((window as unknown as Record<string, unknown>).__POSTHOG_FLAGS__ as
            | Record<string, string | boolean>
            | undefined) || {},
      },
      loaded: (ph) => {
        if (env === "development") {
          ph.debug();
        }
        const userId = (window as unknown as Record<string, unknown>)
          .__INITIAL_USER_ID__ as string;
        if (userId) {
          ph.identify(userId);
        }
        ph.register({ environment: env });
      },
    } as Parameters<typeof posthog.init>[1]);

    if (env === "production") {
      posthog.set_config({ record_canvas: true } as NonNullable<
        Parameters<typeof posthog.init>[1]
      >);
    }

    setClient(posthog);
  }, []);

  if (!client) return <>{children}</>;

  return (
    <PHProvider client={client as unknown as typeof posthog}>
      {children}
    </PHProvider>
  );
}
