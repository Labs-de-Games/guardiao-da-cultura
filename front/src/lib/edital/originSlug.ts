/**
 * Client-safe: no server-only import. Institution slugs are lowercase
 * alphanumeric with hyphens — the same shape a URL path segment and a
 * `?utm_institution=` value both tolerate without encoding. Used to
 * revalidate `session.user.institutionSlug` before it ever reaches HogQL
 * (issue #742: "revalidado contra ORIGIN_SLUG_PATTERN antes de chegar ao
 * HogQL") and will be reused by #746's origins.ts for the same values.
 */
export const ORIGIN_SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

export function isValidOriginSlug(value: string): boolean {
  return ORIGIN_SLUG_PATTERN.test(value);
}
