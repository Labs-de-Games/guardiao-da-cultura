/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import {
  ANONYMOUS_PLAYER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
} from "./lib/edital/anonymousPlayer";
import { middleware } from "./middleware";

function makeRequest(
  path: string,
  cookies: Record<string, string> = {},
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const cookieHeader = Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

describe("middleware — durable anonymous-player cookie", () => {
  it("sets the cookie with a Max-Age when absent", () => {
    const response = middleware(makeRequest("/"));
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
    expect(cookie?.maxAge).toBeGreaterThan(0);
  });

  it("does not overwrite an existing valid cookie", () => {
    const existingId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const response = middleware(
      makeRequest("/", { [ANONYMOUS_PLAYER_COOKIE_NAME]: existingId }),
    );
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    // NextResponse.next() only carries a Set-Cookie header for cookies we
    // explicitly set — an untouched valid cookie means no rewrite happened.
    expect(cookie).toBeUndefined();
  });

  it("does not set the freshly-seeded marker when the cookie already existed", () => {
    const existingId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const response = middleware(
      makeRequest("/", { [ANONYMOUS_PLAYER_COOKIE_NAME]: existingId }),
    );
    expect(
      response.cookies.get(ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME),
    ).toBeUndefined();
  });

  it("sets the freshly-seeded marker when it mints a new cookie", () => {
    const response = middleware(makeRequest("/"));
    const marker = response.cookies.get(
      ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
    );
    expect(marker?.value).toBe("1");
  });

  it("replaces an invalid/malformed cookie value", () => {
    const response = middleware(
      makeRequest("/", { [ANONYMOUS_PLAYER_COOKIE_NAME]: "not valid!" }),
    );
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).not.toBe("not valid!");
  });

  it("still stamps the cookie on a redirect response", () => {
    const response = middleware(makeRequest("/institution"));
    expect(response.status).toBe(307);
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    expect(cookie).toBeDefined();
  });

  it("matcher covers /game/:path* so identity is set before gameplay", async () => {
    const { config } = await import("./middleware");
    expect(config.matcher).toContain("/game/:path*");
  });
});
