/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const mockAuth = jest.fn();
jest.mock("./auth.config", () => ({
  auth: () => mockAuth(),
}));

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

  it("allows the request through with a valid institution session", async () => {
    mockAuth.mockResolvedValue({ user: { role: "institution" } });

    const response = await middleware(makeRequest("/institution"));

    expect(response.status).toBe(200);
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
