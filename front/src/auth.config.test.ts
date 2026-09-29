/**
 * @jest-environment node
 */
// `next-auth` ships ESM that Jest does not transform, and auth.config.ts
// calls NextAuth() at import time. Stubbing the constructor lets the module
// load so the real `authConfig` object — the thing under test — is reached.
jest.mock("next-auth", () => ({
  __esModule: true,
  default: () => ({ auth: jest.fn() }),
}));

import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authConfig } from "./auth.config";

/**
 * Exercises the Edge-safe session callback directly.
 *
 * middleware.ts imports `auth` from auth.config.ts, never from auth.ts, so
 * this callback — not the fuller one next door — decides what the gates can
 * see. The middleware tests mock `auth()` and hand it a ready-made session, so
 * they cannot catch a field this callback forgets to copy: every gate field
 * needs a case here too.
 */
function runSessionCallback(token: Partial<JWT>): Session["user"] {
  const session = { user: {} } as Session;
  const result = authConfig.callbacks.session({
    session,
    token: token as JWT,
  } as Parameters<typeof authConfig.callbacks.session>[0]);
  return (result as Session).user;
}

describe("auth.config session callback", () => {
  it("exposes the fields middleware gates on", () => {
    const user = runSessionCallback({
      userId: "user-1",
      role: "institution",
      institutionSlug: "escola-teste",
      termsAccepted: true,
    });

    expect(user.id).toBe("user-1");
    expect(user.role).toBe("institution");
    expect(user.institutionSlug).toBe("escola-teste");
    expect(user.termsAccepted).toBe(true);
  });

  it("carries termsAccepted through so an accepted account can pass the gate", () => {
    // Regression: this callback originally mirrored role and institutionSlug
    // but not termsAccepted, so middleware read `undefined` on every request.
    // Accepting wrote the consent row and still bounced the user straight
    // back to the terms page — a loop no amount of complying could exit.
    const user = runSessionCallback({
      userId: "user-1",
      role: "institution",
      institutionSlug: "escola-teste",
      termsAccepted: true,
    });

    expect(user.termsAccepted).toBe(true);
  });

  it("reads a token minted before the terms gate as not accepted", () => {
    // Fails closed: an absent claim must not leave the gate open.
    const user = runSessionCallback({
      userId: "user-1",
      role: "institution",
      institutionSlug: "escola-teste",
    });

    expect(user.termsAccepted).toBe(false);
  });

  it("normalises a missing slug to null", () => {
    const user = runSessionCallback({ userId: "user-1", role: "institution" });

    expect(user.institutionSlug).toBeNull();
  });
});
