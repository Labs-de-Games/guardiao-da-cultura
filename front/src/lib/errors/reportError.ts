import posthog from "posthog-js";

export type ErrorPageType =
  | "not_found"
  | "server_error"
  | "maintenance"
  | "asset_load";

export interface ErrorPageContext {
  digest?: string;
  path?: string;
  stage?: string;
  asset_key?: string;
  level_id?: string;
  reason?: string;
}

/**
 * Single entry point for error-page telemetry, so every fallback screen is
 * tagged consistently and can be grouped by `error_page_type`.
 */
export function reportErrorPage(
  type: ErrorPageType,
  error?: unknown,
  context: ErrorPageContext = {},
): void {
  const properties = {
    ...context,
    path:
      context.path ??
      (typeof window !== "undefined" ? window.location.pathname : undefined),
    // Set last so callers can't override the grouping key.
    error_page_type: type,
  };

  try {
    if (error instanceof Error) {
      posthog.captureException(error, properties);
    } else {
      posthog.capture("error_page_viewed", properties);
    }
  } catch {
    // Telemetry must never break the fallback UI.
  }
}

const REPORTED_KEY_PREFIX = "gp_error_page_reported:";

/**
 * Reports at most once per browser session for `key`, so pages that reload
 * (e.g. maintenance recovery) don't flood telemetry.
 */
export function reportErrorPageOncePerSession(
  type: ErrorPageType,
  key: string,
  context: ErrorPageContext = {},
): void {
  const storageKey = `${REPORTED_KEY_PREFIX}${type}:${key}`;
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // Storage unavailable: report anyway rather than lose the signal.
  }
  reportErrorPage(type, undefined, context);
}
