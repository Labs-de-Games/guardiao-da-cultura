import {
  ANONYMOUS_PLAYER_COOKIE_NAME,
  ANONYMOUS_PLAYER_ID_MAX_LENGTH,
  isValidAnonymousPlayerId,
  migrateLegacyGuestIdToCookie,
  readAnonymousPlayerIdFromDocumentCookie,
} from "./anonymousPlayer";

describe("isValidAnonymousPlayerId", () => {
  it("accepts a UUID", () => {
    expect(
      isValidAnonymousPlayerId("f47ac10b-58cc-4372-a567-0e02b2c3d479"),
    ).toBe(true);
  });

  it("rejects null and undefined", () => {
    expect(isValidAnonymousPlayerId(null)).toBe(false);
    expect(isValidAnonymousPlayerId(undefined)).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isValidAnonymousPlayerId("")).toBe(false);
  });

  it("rejects a value longer than the max length", () => {
    const tooLong = "a".repeat(ANONYMOUS_PLAYER_ID_MAX_LENGTH + 1);
    expect(isValidAnonymousPlayerId(tooLong)).toBe(false);
  });

  it("accepts a value exactly at the max length", () => {
    const exact = "a".repeat(ANONYMOUS_PLAYER_ID_MAX_LENGTH);
    expect(isValidAnonymousPlayerId(exact)).toBe(true);
  });

  it("rejects characters outside the safe charset", () => {
    expect(isValidAnonymousPlayerId("not a valid id!")).toBe(false);
    expect(isValidAnonymousPlayerId("<script>alert(1)</script>")).toBe(false);
  });
});

describe("readAnonymousPlayerIdFromDocumentCookie", () => {
  afterEach(() => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  it("returns null when the cookie is absent", () => {
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBeNull();
  });

  it("returns the cookie value when present and valid", () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBe(
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    );
  });

  it("returns null when the cookie value is invalid", () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=not valid!; path=/`;
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBeNull();
  });
});

describe("migrateLegacyGuestIdToCookie", () => {
  const MIGRATION_MARKER_KEY = "gp_anon_id_migrated";
  const legacyId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

  afterEach(() => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    window.localStorage.removeItem(MIGRATION_MARKER_KEY);
  });

  it("seeds the cookie from the legacy id when freshly seeded", () => {
    migrateLegacyGuestIdToCookie(legacyId, true);
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBe(legacyId);
  });

  it("does nothing when the cookie was not freshly seeded", () => {
    migrateLegacyGuestIdToCookie(legacyId, false);
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBeNull();
  });

  it("does nothing when there is no legacy id", () => {
    migrateLegacyGuestIdToCookie(null, true);
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBeNull();
  });

  it("only runs once per browser", () => {
    migrateLegacyGuestIdToCookie(legacyId, true);
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

    migrateLegacyGuestIdToCookie(legacyId, true);

    expect(readAnonymousPlayerIdFromDocumentCookie()).toBeNull();
  });

  it("rejects an invalid legacy id", () => {
    migrateLegacyGuestIdToCookie("not valid!", true);
    expect(readAnonymousPlayerIdFromDocumentCookie()).toBeNull();
  });
});
