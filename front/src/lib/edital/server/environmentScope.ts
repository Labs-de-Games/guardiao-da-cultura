import "server-only";
import { serverEnv } from "../../env-server";
import type { HogQLValues } from "./hogql";

/**
 * Staging and production share one PostHog project, so every dashboard
 * query must be narrowed to the current deployment's own events.
 *
 * - `properties.environment` — the super-property every client event
 *   carries (eventContext.ts), from the build-time NEXT_PUBLIC_ENV.
 * - `properties.$host` — posthog-js's own hostname property, bound only
 *   when AUTH_URL is set (staging/production). Events from before
 *   NEXT_PUBLIC_ENV was baked per environment all say "production",
 *   including staging's, so the host is what keeps old staging plays out
 *   of production's numbers.
 *
 * Both are bound HogQL values, never string-interpolated.
 */
export function environmentPredicate(): string {
  const base = "properties.environment = {environment}";
  return currentHost() ? `${base} AND properties.$host = {host}` : base;
}

export function environmentValues(): HogQLValues {
  const host = currentHost();
  const values: HogQLValues = { environment: serverEnv.client.env };
  if (host) values.host = host;
  return values;
}

function currentHost(): string | undefined {
  const authUrl = serverEnv.server.authUrl;
  return authUrl ? new URL(authUrl).host : undefined;
}
