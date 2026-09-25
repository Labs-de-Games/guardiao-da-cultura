/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const mockAuth = jest.fn();
jest.mock("./auth.config", () => ({
  auth: () => mockAuth(),
}));

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

describe("middleware — institution routes gated by NextAuth session", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("redirects to /login when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await middleware(makeRequest("/institution"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("redirects to /login when the session role is not institution", async () => {
    mockAuth.mockResolvedValue({ user: { role: "player" } });

    const response = await middleware(makeRequest("/institution"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows the request through with a valid, linked institution session", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-exemplo" },
    });

    const response = await middleware(makeRequest("/institution"));

    expect(response.status).toBe(200);
  });

  it("redirects to onboarding when the institution session has no slug yet", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: null },
    });

    const response = await middleware(makeRequest("/institution"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain(
      "/institution/onboarding",
    );
  });

  it("lets an unlinked institution session reach the onboarding page itself", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: null },
    });

    const response = await middleware(makeRequest("/institution/onboarding"));

    expect(response.status).toBe(200);
  });

  it("redirects an already-onboarded institution away from the onboarding page", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-teste" },
    });

    const response = await middleware(makeRequest("/institution/onboarding"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/institution");
    expect(
      response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME)?.value,
    ).toBeDefined();
  });

  it("also gates institution sub-routes", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await middleware(makeRequest("/institution/settings"));

    expect(response.headers.get("location")).toContain("/login");
  });

  it("never consults the legacy auth_status cookie for institution routes", async () => {
    // A forged auth_status cookie must not grant access — only a real
    // NextAuth session does, per issue #744's acceptance criteria.
    mockAuth.mockResolvedValue(null);

    const response = await middleware(
      makeRequest("/institution", { auth_status: "authenticated" }),
    );

    expect(response.headers.get("location")).toContain("/login");
  });

  it("does not call auth() for unrelated routes", async () => {
    await middleware(makeRequest("/"));

    expect(mockAuth).not.toHaveBeenCalled();
  });
});

describe("middleware — durable anonymous-player cookie", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockAuth.mockResolvedValue(null);
  });

  it("sets the cookie with a Max-Age when absent", async () => {
    const response = await middleware(makeRequest("/"));
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).toMatch(/^[A-Za-z0-9_-]{1,200}$/);
    expect(cookie?.maxAge).toBeGreaterThan(0);
  });

  it("does not overwrite an existing valid cookie", async () => {
    const existingId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const response = await middleware(
      makeRequest("/", { [ANONYMOUS_PLAYER_COOKIE_NAME]: existingId }),
    );
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    // NextResponse.next() only carries a Set-Cookie header for cookies we
    // explicitly set — an untouched valid cookie means no rewrite happened.
    expect(cookie).toBeUndefined();
  });

  it("does not set the freshly-seeded marker when the cookie already existed", async () => {
    const existingId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const response = await middleware(
      makeRequest("/", { [ANONYMOUS_PLAYER_COOKIE_NAME]: existingId }),
    );
    expect(
      response.cookies.get(ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME),
    ).toBeUndefined();
  });

  it("sets the freshly-seeded marker when it mints a new cookie", async () => {
    const response = await middleware(makeRequest("/"));
    const marker = response.cookies.get(
      ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
    );
    expect(marker?.value).toBe("1");
  });

  it("replaces an invalid/malformed cookie value", async () => {
    const response = await middleware(
      makeRequest("/", { [ANONYMOUS_PLAYER_COOKIE_NAME]: "not valid!" }),
    );
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie?.value).not.toBe("not valid!");
  });

  it("still stamps the cookie on an institution-route redirect response", async () => {
    const response = await middleware(makeRequest("/institution"));
    expect(response.status).toBe(307);
    const cookie = response.cookies.get(ANONYMOUS_PLAYER_COOKIE_NAME);
    expect(cookie).toBeDefined();
  });

  it("matcher covers /game/:path* so identity is set before gameplay", async () => {
    const { config } = await import("./middleware");
    expect(config.matcher).toContain("/game/:path*");
  });
});
