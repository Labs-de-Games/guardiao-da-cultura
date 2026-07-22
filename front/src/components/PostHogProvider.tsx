"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { env } from "../lib/env";
import { FeatureFlagProvider } from "../lib/posthog/FeatureFlagContext";
import { PostHogStub } from "../lib/posthogStub";

interface PostHogBootstrapData {
  distinctId: string;
  featureFlags: Record<string, string | boolean | number>;
}

function setGuestPlayCookie(enabled: boolean): void {
  if (typeof document === "undefined") return;
  const value = enabled ? "1" : "0";
  document.cookie = `gp_guest_play=${value}; path=/; SameSite=Lax`;
}

function setDistinctIdCookie(distinctId: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `gp_distinct_id=${distinctId}; path=/; SameSite=Lax`;
}

async function fetchBootstrap(): Promise<PostHogBootstrapData | null> {
  try {
    const apiUrl = env.NEXT_PUBLIC_API_URL || "";
    const url = apiUrl
      ? `${apiUrl}/api/v1/posthog/bootstrap`
      : "/api/v1/posthog/bootstrap";
    const response = await fetch(url, {
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
  const [bootstrapData, setBootstrapData] =
    useState<PostHogBootstrapData | null>(null);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    const environment = env.NEXT_PUBLIC_ENV;

    if (!key) {
      console.warn(
        "[PostHog] No key set. Using PostHogStub. Events will be logged to console only.",
      );
      setClient(new PostHogStub());
      return;
    }

    void (async () => {
      const bootstrap = await fetchBootstrap();
      setBootstrapData(bootstrap);

      if (bootstrap) {
        const guestPlayEnabled =
          bootstrap.featureFlags.guest_play_enabled === true;
        setGuestPlayCookie(guestPlayEnabled);
        setDistinctIdCookie(bootstrap.distinctId);
      }

      const recordSessionsPercent =
        typeof bootstrap?.featureFlags?.session_replay_sampling_rate ===
        "number"
          ? (bootstrap.featureFlags.session_replay_sampling_rate as number)
          : 1.0;

      posthog.init(key, {
        api_host: host || "https://us.i.posthog.com",
        autocapture: false,
        capture_pageview: false,
        capture_web_vitals: true,
        capture_dead_clicks: true,
        record_sessions_percent: recordSessionsPercent,
        record_canvas: environment === "production",
        opt_in_site_apps: environment === "production",
        __add_tracing_headers: [],
        bootstrap: {
          distinctID: bootstrap?.distinctId,
          featureFlags: bootstrap?.featureFlags ?? {},
        },
        loaded: (ph) => {
          if (environment === "development") {
            ph.debug();
          }
          ph.register({ environment });
        },
      } as Parameters<typeof posthog.init>[1]);

      setClient(posthog);
    })();
  }, []);

  if (!client) return <>{children}</>;

  return (
    <PHProvider client={client as unknown as typeof posthog}>
      <FeatureFlagProvider
        initialData={
          bootstrapData
            ? {
                distinctId: bootstrapData.distinctId,
                featureFlags: bootstrapData.featureFlags,
              }
            : undefined
        }
      >
        {children}
      </FeatureFlagProvider>
    </PHProvider>
  );
}
