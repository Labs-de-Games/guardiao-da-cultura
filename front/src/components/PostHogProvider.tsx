"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import {
  migrateLegacyGuestIdToCookie,
  readAnonymousPlayerIdFromDocumentCookie,
  wasAnonymousPlayerCookieFreshlySeeded,
} from "../lib/edital/anonymousPlayer";
import { INSTITUTION_UTM_PARAM } from "../lib/edital/campaign";
import { captureAnonymousPlayerCreatedOnce } from "../lib/edital/events";
import { env } from "../lib/env";
import { getGuestSessionId } from "../lib/guestSession";
import { createBeforeSend } from "../lib/posthog/beforeSend";
import {
  registerEventContext,
  setAnonymousPlayerId,
} from "../lib/posthog/eventContext";
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

async function fetchBootstrap(
  distinctId: string | null,
): Promise<PostHogBootstrapData | null> {
  try {
    const apiUrl = env.client.apiUrl || "";
    const base = apiUrl
      ? `${apiUrl}/api/v1/posthog/bootstrap`
      : "/api/v1/posthog/bootstrap";
    // The cookie alone is not enough: it doesn't cross the cross-origin
    // local-dev gap (localhost:3000 -> :3001), so the same id also goes as
    // a query parameter the backend validates and only prefers after the
    // cookie.
    const url = distinctId
      ? `${base}?distinct_id=${encodeURIComponent(distinctId)}`
      : base;
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
    const key = env.client.posthogKey;
    const host = env.client.posthogHost;
    const environment = env.client.env;

    if (!key) {
      console.warn(
        "[PostHog] No key set. Using PostHogStub. Events will be logged to console only.",
      );
      setClient(new PostHogStub());
      return;
    }

    const freshlySeeded = wasAnonymousPlayerCookieFreshlySeeded();

    // One-time seed of the pre-existing localStorage guest id into the
    // durable cookie, only on the request where middleware just minted a
    // brand-new one — see lib/edital/anonymousPlayer.ts.
    migrateLegacyGuestIdToCookie(getGuestSessionId(), freshlySeeded);

    const cookieDistinctId = readAnonymousPlayerIdFromDocumentCookie();

    // Init synchronously, before any network round trip — this is the
    // structural fix for the lost `landing_page_viewed` capture (discovery
    // §5.2): the previous code awaited the bootstrap fetch before calling
    // posthog.init(), so a fast bounce meant the very first pageview was
    // captured before there was a client to send it. `record_sessions_percent`
    // and `record_canvas` are the only options that genuinely need flags at
    // init time; a conservative default for one pageview is a non-issue
    // next to losing funnel step 1.
    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_web_vitals: true,
      capture_dead_clicks: true,
      record_sessions_percent: 1.0,
      record_canvas: environment === "production",
      opt_in_site_apps: environment === "production",
      // posthog-js auto-captures standard utm_* as last-touch already;
      // this only tells it to also read the non-standard institution key.
      // First-touch persistence on top of that is eventContext's job.
      custom_campaign_params: [INSTITUTION_UTM_PARAM],
      __add_tracing_headers: [],
      bootstrap: {
        distinctID: cookieDistinctId ?? undefined,
        featureFlags: {},
      },
      before_send: createBeforeSend(posthog),
      loaded: (ph) => {
        if (environment === "development") {
          ph.debug();
        }
        setAnonymousPlayerId(cookieDistinctId);
        registerEventContext(ph, {
          environment,
          searchParams: new URLSearchParams(window.location.search),
        });
      },
    } as Parameters<typeof posthog.init>[1]);

    setClient(posthog);
    captureAnonymousPlayerCreatedOnce(posthog, freshlySeeded);

    void (async () => {
      const bootstrap = await fetchBootstrap(cookieDistinctId);
      setBootstrapData(bootstrap);

      if (bootstrap) {
        const guestPlayEnabled =
          bootstrap.featureFlags.guest_play_enabled === true;
        setGuestPlayCookie(guestPlayEnabled);
        // No client-side distinct-id cookie write here: the durable cookie
        // is server-set by middleware (see lib/edital/anonymousPlayer.ts).
        // A client writer on the identity cookie was the churn amplifier
        // this step exists to remove.
      }
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
