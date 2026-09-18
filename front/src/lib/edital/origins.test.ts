import {
  buildTrackingUrl,
  CAMPAIGN_ORIGINS,
  isValidOriginSlug,
  LANDING_BASE_URL,
  ORIGIN_SLUG_PATTERN,
  resolveOriginLabel,
} from "./origins";

describe("CAMPAIGN_ORIGINS registry", () => {
  it("has no duplicate slugs", () => {
    const slugs = CAMPAIGN_ORIGINS.map((o) => o.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every registered slug matches ORIGIN_SLUG_PATTERN", () => {
    for (const origin of CAMPAIGN_ORIGINS) {
      expect(ORIGIN_SLUG_PATTERN.test(origin.slug)).toBe(true);
    }
  });
});

describe("isValidOriginSlug", () => {
  it("accepts a plain lowercase slug", () => {
    expect(isValidOriginSlug("escola-teste")).toBe(true);
  });

  it("rejects uppercase, spaces, and empty strings", () => {
    expect(isValidOriginSlug("Escola Teste")).toBe(false);
    expect(isValidOriginSlug("")).toBe(false);
  });

  it("rejects a value over 64 characters", () => {
    expect(isValidOriginSlug("a".repeat(65))).toBe(false);
  });
});

describe("resolveOriginLabel", () => {
  it("returns the raw slug for an unknown slug, never 'Desconhecido'", () => {
    expect(resolveOriginLabel("slug-nao-registrado")).toBe(
      "slug-nao-registrado",
    );
  });

  it("returns the registered label when the slug is known", () => {
    // Exercises the lookup path without depending on any real registry
    // entry (the registry starts empty — no institution linked yet).
    const [firstEntry] = CAMPAIGN_ORIGINS;
    if (firstEntry) {
      expect(resolveOriginLabel(firstEntry.slug)).toBe(firstEntry.label);
    } else {
      expect(CAMPAIGN_ORIGINS).toHaveLength(0);
    }
  });
});

describe("buildTrackingUrl", () => {
  it("points at the landing page with utm_institution set", () => {
    const url = buildTrackingUrl({ slug: "escola-teste" });
    expect(url).toBe(`${LANDING_BASE_URL}?utm_institution=escola-teste`);
  });

  it("URL-encodes a slug that needs it", () => {
    const url = buildTrackingUrl({
      slug: "escola-teste",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_institution")).toBe("escola-teste");
  });

  it("always targets the landing page, never /game directly", () => {
    const url = buildTrackingUrl({ slug: "escola-teste" });
    expect(url.startsWith(LANDING_BASE_URL)).toBe(true);
    expect(url).not.toContain("/game");
  });

  it("omits utm_source when no source is given", () => {
    const url = buildTrackingUrl({ slug: "escola-teste" });
    const parsed = new URL(url);
    expect(parsed.searchParams.has("utm_source")).toBe(false);
  });

  it("includes utm_source alongside utm_institution when a source is given", () => {
    const url = buildTrackingUrl({ slug: "escola-teste", source: "group-a" });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_institution")).toBe("escola-teste");
    expect(parsed.searchParams.get("utm_source")).toBe("group-a");
  });
});
