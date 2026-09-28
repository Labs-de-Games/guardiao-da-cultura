"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, useState } from "react";
import { useConsent } from "../lib/consent/ConsentContext";
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

/**
 * Feature flags are resolved before consent too — `guest_play_enabled` is a
 * kill switch that decides whether the game is playable at all, so blocking it
 * would cost every undecided player PlayerGuard's 5s timeout. Pre-consent the
 * player's `distinct_id` is withheld (the backend then evaluates the flag under
 * a constant server-side id), so nothing identifying reaches PostHog until the
 * player agrees. See issue #864.
 */
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
  const { state: consentState } = useConsent();

  // Flags are needed whether or not the player has consented (PlayerGuard
  // gates the whole game on `guest_play_enabled`), so this runs on its own,
  // independent of the init effect below. Before consent the durable
  // `distinct_id` is withheld and the backend falls back to a constant id.
  useEffect(() => {
    if (consentState === "loading") return;

    const consented = consentState === "accepted";
    const cookieDistinctId = consented
      ? readAnonymousPlayerIdFromDocumentCookie()
      : null;

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
  }, [consentState]);

  useEffect(() => {
    const key = env.client.posthogKey;
    const host = env.client.posthogHost;
    const environment = env.client.env;

    // The consent gate (issue #864). Until the player accepts, `init()` is
    // never called — and posthog-js drops `capture()` on an uninitialized
    // instance rather than queueing it, so the ~60 modules that import the
    // singleton directly need no changes and nothing is sent retroactively
    // once consent arrives.
    if (consentState !== "accepted") return;

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
    // captured before there was a client to send it.
    //
    // Session replay and canvas recording are deliberately absent: issue #864
    // puts both out of scope, so `record_sessions_percent` / `record_canvas`
    // are not set at all rather than set to zero.
    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      autocapture: false,
      capture_pageview: false,
      capture_web_vitals: true,
      capture_dead_clicks: true,
      disable_session_recording: true,
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
      before_send: createBeforeSend(posthog, { environment }),
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
  }, [consentState]);

  // FeatureFlagProvider wraps `children` on every path, including the one
  // where there is no PostHog client. Gating it on the client — as this
  // component used to — would leave every pre-consent player on
  // PlayerGuard's default `{}` and cost them its 5s LoadingScreen timeout.
  const flags = (
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
  );

  if (!client) return flags;

  return (
    <PHProvider client={client as unknown as typeof posthog}>
      {flags}
    </PHProvider>
  );
}
