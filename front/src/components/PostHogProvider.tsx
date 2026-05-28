"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { PostHogStub } from "../lib/posthogStub";

interface PostHogBootstrapData {
  distinctId: string;
  featureFlags: Record<string, string | boolean | number>;
}

async function fetchBootstrap(): Promise<PostHogBootstrapData | null> {
  try {
    const response = await fetch("/api/v1/posthog/bootstrap", {
      credentials: "include",
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PostHogBootstrapData;
  } catch {
    return null;
  }
}

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

    void (async () => {
      const bootstrap = await fetchBootstrap();

      const recordSessionsPercent =
        typeof bootstrap?.featureFlags?.session_replay_sampling_rate ===
        "number"
          ? (bootstrap.featureFlags.session_replay_sampling_rate as number)
          : 1.0;

      posthog.init(key, {
        api_host: host || "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        record_sessions_percent: recordSessionsPercent,
        record_canvas: env === "production",
        opt_in_site_apps: env === "production",
        __add_tracing_headers: [],
        bootstrap: {
          distinctID: bootstrap?.distinctId,
          featureFlags: bootstrap?.featureFlags ?? {},
        },
        loaded: (ph) => {
          if (env === "development") {
            ph.debug();
          }
          const userId = bootstrap?.distinctId;
          if (userId) {
            ph.identify(userId);
          }
          ph.register({ environment: env });
        },
      } as Parameters<typeof posthog.init>[1]);

      setClient(posthog);
    })();
  }, []);

  if (!client) return <>{children}</>;

  return (
    <PHProvider client={client as unknown as typeof posthog}>
      {children}
    </PHProvider>
  );
}
