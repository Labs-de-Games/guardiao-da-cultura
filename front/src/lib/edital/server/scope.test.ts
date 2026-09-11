/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import type { Session } from "next-auth";
import { resolveScope } from "./scope";

function makeSession(overrides: Partial<Session["user"]> = {}): Session {
  return {
    user: {
      id: "user-1",
      role: "institution",
      institutionSlug: "escola-teste",
      ...overrides,
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

describe("resolveScope", () => {
  it("returns a Scope for a linked institution session", () => {
    const scope = resolveScope(makeSession());
    expect(scope).not.toBeNull();
    expect(scope?.slug).toBe("escola-teste");
  });

  it("returns null for no session", () => {
    expect(resolveScope(null)).toBeNull();
  });

  it("returns null for a player role", () => {
    expect(resolveScope(makeSession({ role: "player" }))).toBeNull();
  });

  it("returns null for an admin role", () => {
    expect(resolveScope(makeSession({ role: "admin" }))).toBeNull();
  });

  it("returns null for an unlinked institution account (institutionSlug: null)", () => {
    expect(resolveScope(makeSession({ institutionSlug: null }))).toBeNull();
  });

  it("returns null when session.user is missing", () => {
    expect(resolveScope({ expires: "2099-01-01" } as Session)).toBeNull();
  });

  it("returns null for a malformed institutionSlug (e.g. uppercase or spaces)", () => {
    expect(
      resolveScope(makeSession({ institutionSlug: "Escola Teste" })),
    ).toBeNull();
  });

  it("returns null for an institutionSlug containing SQL-injection-shaped input", () => {
    expect(
      resolveScope(makeSession({ institutionSlug: "' OR 1=1 --" })),
    ).toBeNull();
  });

  it("returns a Scope for a well-formed institutionSlug", () => {
    const scope = resolveScope(makeSession({ institutionSlug: "escola-42" }));
    expect(scope?.slug).toBe("escola-42");
  });
});
