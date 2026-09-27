import { getSafeRedirectPath } from "./safeRedirect";

const ORIGIN = "https://game.example";

describe("getSafeRedirectPath", () => {
  it.each([
    "/game",
    "/game?flow=map",
    "/game#top",
    "/game?level=2#top",
    "/",
  ])("keeps same-origin path %p", (candidate) => {
    expect(getSafeRedirectPath(candidate, "/", ORIGIN)).toBe(candidate);
  });

  it.each([
    null,
    undefined,
    "",
    "game",
    "https://evil.com",
    "//evil.com",
    "///evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "/ /evil.com",
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "data:text/html,hi",
    `/${"a".repeat(3000)}`,
  ])("falls back for unsafe value %p", (candidate) => {
    expect(getSafeRedirectPath(candidate, "/", ORIGIN)).toBe("/");
  });

  it("rejects values decoded from a crafted query string", () => {
    const next = new URLSearchParams("next=%2F%09%2Fevil.com").get("next");
    expect(getSafeRedirectPath(next, "/", ORIGIN)).toBe("/");
  });

  it("uses the provided fallback", () => {
    expect(getSafeRedirectPath("//evil.com", "/login", ORIGIN)).toBe("/login");
  });

  it("defaults to the current window origin", () => {
    expect(getSafeRedirectPath("/game")).toBe("/game");
  });
});
