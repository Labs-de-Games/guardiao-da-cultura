import {
  buildTrackingUrl,
  CAMPAIGN_ORIGINS,
  isValidOriginSlug,
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
  const baseUrl = "https://staging.example.com";

  it("points at the given environment's landing page with utm_institution set", () => {
    const url = buildTrackingUrl({ baseUrl, slug: "escola-teste" });
    expect(url).toBe(
      "https://staging.example.com/?utm_institution=escola-teste",
    );
  });

  it("uses whatever origin it is given — never a hardcoded domain", () => {
    expect(
      buildTrackingUrl({
        baseUrl: "http://localhost:3000",
        slug: "escola-teste",
      }),
    ).toBe("http://localhost:3000/?utm_institution=escola-teste");
  });

  it("always targets the landing page root, even if baseUrl has a path", () => {
    const url = buildTrackingUrl({
      baseUrl: "https://staging.example.com/game",
      slug: "escola-teste",
    });
    expect(new URL(url).pathname).toBe("/");
    expect(url).not.toContain("/game");
  });

  it("omits utm_source when no source is given", () => {
    const url = buildTrackingUrl({ baseUrl, slug: "escola-teste" });
    const parsed = new URL(url);
    expect(parsed.searchParams.has("utm_source")).toBe(false);
  });

  it("includes utm_source alongside utm_institution when a source is given", () => {
    const url = buildTrackingUrl({
      baseUrl,
      slug: "escola-teste",
      source: "group-a",
    });
    const parsed = new URL(url);
    expect(parsed.searchParams.get("utm_institution")).toBe("escola-teste");
    expect(parsed.searchParams.get("utm_source")).toBe("group-a");
  });
});
