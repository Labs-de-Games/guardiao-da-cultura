/**
 * Client-safe: no server-only import. The registry of tracked campaign
 * origins (issue #746) — one place, reused by the /institution/links
 * generator (front) and by scope validation (server/scope.ts imports
 * `isValidOriginSlug` only; it never needs the registry itself, since
 * an institution's own slug is validated by format, not by membership in
 * this list — see the "backend needs no copy" note below).
 */

/**
 * Institution slugs are lowercase alphanumeric with single internal
 * hyphens — the same shape a URL path segment and a `?utm_institution=`
 * value both tolerate without encoding. No leading/trailing/double
 * hyphens: `/^[a-z0-9-]{1,64}$/` alone would accept `"--"`,
 * `"-escola-"`, or `"escola--teste"`, which are not real slugs, just
 * strings drawn from the same charset. Used to validate free-text slug
 * entry here, and to revalidate `session.user.institutionSlug` before it
 * reaches HogQL (server/scope.ts) — the backend needs no copy of this
 * file, only this one pattern, bound as a HogQL value.
 */
export const ORIGIN_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const ORIGIN_SLUG_MAX_LENGTH = 64;

export function isValidOriginSlug(value: string): boolean {
  return (
    value.length <= ORIGIN_SLUG_MAX_LENGTH && ORIGIN_SLUG_PATTERN.test(value)
  );
}

export interface CampaignOrigin {
  slug: string;
  label: string;
  kind: "school" | "partner" | "other";
  notes?: string;
}

/**
 * Registry-as-TypeScript: a deploy per institution (discovery §7's
 * accepted-cost risk — "make the cost visible in origins.ts"). Starts
 * empty — no real institution has been linked yet as of this step (that
 * happens via the admin seed/update script, #744's own documented manual
 * step). Add one entry per institution as they're onboarded; slug MUST
 * match ORIGIN_SLUG_PATTERN (enforced by the guard test below) and MUST
 * be unique (also enforced by test).
 */
export const CAMPAIGN_ORIGINS: readonly CampaignOrigin[] = [];

/**
 * Returns the raw slug for anything not in the registry — never
 * "Desconhecido" (issue #746's own words): a slug that shows up in real
 * data but isn't registered yet must stay identifiable on the dashboard
 * and in the CSV, not disappear behind a generic label.
 */
export function resolveOriginLabel(slug: string): string {
  const origin = CAMPAIGN_ORIGINS.find((entry) => entry.slug === slug);
  return origin?.label ?? slug;
}

export interface BuildTrackingUrlParams {
  /**
   * The environment's own public origin (e.g. https://staging.example.com)
   * — never a hardcoded domain, so a link generated on staging or locally
   * doesn't send players into production's funnel. Resolved server-side by
   * `resolveLandingBaseUrl`.
   */
  baseUrl: string;
  slug: string;
  /** Group/class label within the institution — emitted as utm_source. */
  source?: string;
}

/**
 * `<baseUrl>/?utm_institution=<slug>&utm_source=…` — per issue #746's
 * spec. Always the landing page (`/`), not /game directly: that preserves
 * the first two funnel steps (landing_page_viewed, play_clicked) for every
 * campaign-sourced player. Empty/undefined UTM fields are omitted rather
 * than sent as empty strings.
 */
export function buildTrackingUrl(params: BuildTrackingUrlParams): string {
  const url = new URL("/", params.baseUrl);
  url.searchParams.set("utm_institution", params.slug);
  if (params.source) {
    url.searchParams.set("utm_source", params.source);
  }
  return url.toString();
}
