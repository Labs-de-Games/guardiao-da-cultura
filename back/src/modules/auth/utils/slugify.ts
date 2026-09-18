/**
 * Lowercase, hyphenated, ASCII-only slug from a display name — the base
 * candidate for `institutionSlug`. Never used as-is when a collision is
 * possible; callers must check uniqueness and disambiguate (see
 * `oauth-upsert.controller.ts`'s onboarding handler).
 */
export function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "instituicao"
  );
}
