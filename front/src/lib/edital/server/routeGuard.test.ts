/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

const mockAuth = jest.fn();
jest.mock("../../../auth", () => ({
  auth: () => mockAuth(),
}));

import { NextRequest } from "next/server";
import { resolveEditalRequestContext } from "./routeGuard";

function makeRequest(query = ""): NextRequest {
  return new NextRequest(`http://localhost:3000/api/edital/summary${query}`);
}

describe("resolveEditalRequestContext", () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it("returns unauthenticated when there is no session", async () => {
    mockAuth.mockResolvedValue(null);

    const ctx = await resolveEditalRequestContext(makeRequest());

    expect(ctx.kind).toBe("unauthenticated");
  });

  it("returns unlinked for a player-role session (never reaches param parsing)", async () => {
    mockAuth.mockResolvedValue({ user: { role: "player" } });

    const ctx = await resolveEditalRequestContext(
      makeRequest("?dateRange=bogus"),
    );

    expect(ctx.kind).toBe("unlinked");
  });

  it("returns unlinked for an institution session with institutionSlug: null", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: null },
    });

    const ctx = await resolveEditalRequestContext(makeRequest());

    expect(ctx.kind).toBe("unlinked");
  });

  it("returns invalid-params for a malformed dateRange", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-teste" },
    });

    const ctx = await resolveEditalRequestContext(
      makeRequest("?dateRange=bogus"),
    );

    expect(ctx.kind).toBe("invalid-params");
  });

  it("ignores a forged slug/campaign query parameter entirely", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-a" },
    });

    const ctx = await resolveEditalRequestContext(
      makeRequest("?slug=escola-b&campaign=escola-b"),
    );

    expect(ctx.kind).toBe("ok");
    if (ctx.kind === "ok") {
      expect(ctx.scope.slug).toBe("escola-a");
    }
  });

  it("returns ok with a resolved scope and range for a valid linked session", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-teste" },
    });

    const ctx = await resolveEditalRequestContext(
      makeRequest("?dateRange=30d"),
    );

    expect(ctx.kind).toBe("ok");
    if (ctx.kind === "ok") {
      expect(ctx.scope.slug).toBe("escola-teste");
      expect(ctx.range.from).toBeInstanceOf(Date);
      expect(ctx.range.to).toBeInstanceOf(Date);
    }
  });

  it("resolves turmaSource from a valid ?turma= (issue #807)", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-teste" },
    });

    const ctx = await resolveEditalRequestContext(
      makeRequest("?turma=group-a"),
    );

    expect(ctx.kind).toBe("ok");
    if (ctx.kind === "ok") {
      expect(ctx.turmaSource).toBe("group-a");
    }
  });

  it("leaves turmaSource undefined (institution-wide) when ?turma= is absent", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-teste" },
    });

    const ctx = await resolveEditalRequestContext(makeRequest());

    expect(ctx.kind).toBe("ok");
    if (ctx.kind === "ok") {
      expect(ctx.turmaSource).toBeUndefined();
    }
  });

  it("silently falls back to institution-wide for a malformed ?turma= instead of a 400", async () => {
    mockAuth.mockResolvedValue({
      user: { role: "institution", institutionSlug: "escola-teste" },
    });

    const ctx = await resolveEditalRequestContext(
      makeRequest("?turma=Group%20A!"),
    );

    expect(ctx.kind).toBe("ok");
    if (ctx.kind === "ok") {
      expect(ctx.turmaSource).toBeUndefined();
    }
  });
});
