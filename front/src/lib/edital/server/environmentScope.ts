import "server-only";
import { serverEnv } from "../../env-server";
import type { HogQLValues } from "./hogql";

/**
 * Staging and production share one PostHog project, so every dashboard
 * query must be narrowed to the current deployment's own events.
 *
 * - Deployed (AUTH_URL set): `properties.$host`, posthog-js's own hostname
 *   property, present on every client event. The host is the reliable
 *   discriminator: events from before NEXT_PUBLIC_ENV was baked per
 *   environment all say environment "production" — staging's included —
 *   so filtering by host keeps staging's history on staging and old
 *   staging plays out of production, without depending on that tag.
 * - Local (no AUTH_URL): `properties.environment`, since the host there is
 *   just localhost.
 *
 * The value is always bound, never string-interpolated.
 */
export function environmentPredicate(): string {
  return currentHost()
    ? "properties.$host = {host}"
    : "properties.environment = {environment}";
}

export function environmentValues(): HogQLValues {
  const host = currentHost();
  return host ? { host } : { environment: serverEnv.client.env };
}

function currentHost(): string | undefined {
  const authUrl = serverEnv.server.authUrl;
  return authUrl ? new URL(authUrl).host : undefined;
}
