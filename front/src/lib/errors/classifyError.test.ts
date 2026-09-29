import { EditalApiError } from "@/lib/api/edital";
import { AuthError } from "@/lib/api/errors";
import { classifyError, classifyStatus } from "./classifyError";

describe("classifyStatus", () => {
  it.each([
    [400, "badRequest"],
    [401, "unauthorized"],
    [403, "unauthorized"],
    [404, "notFound"],
    [422, "badRequest"],
    [500, "server"],
    [503, "server"],
    [302, "unknown"],
  ] as const)("maps %i to %s", (status, kind) => {
    expect(classifyStatus(status)).toBe(kind);
  });
});

describe("classifyError", () => {
  it("uses the status of an EditalApiError", () => {
    expect(classifyError(new EditalApiError("x", 401))).toBe("unauthorized");
    expect(classifyError(new EditalApiError("x", 502))).toBe("server");
  });

  it("uses the statusCode of an AuthError", () => {
    expect(classifyError(new AuthError("x", 404))).toBe("notFound");
  });

  it("treats a fetch TypeError as a network failure", () => {
    expect(classifyError(new TypeError("Failed to fetch"))).toBe("network");
  });

  it("falls back to unknown for anything else", () => {
    expect(classifyError(new Error("boom"))).toBe("unknown");
    expect(classifyError("boom")).toBe("unknown");
    expect(classifyError(null)).toBe("unknown");
  });
});
