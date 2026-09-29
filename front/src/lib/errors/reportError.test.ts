import posthog from "posthog-js";
import {
  type ErrorPageContext,
  reportErrorPage,
  reportErrorPageOncePerSession,
} from "./reportError";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn(), captureException: jest.fn() },
}));

describe("reportErrorPage", () => {
  beforeEach(() => jest.clearAllMocks());

  it("captures exceptions with the error page type", () => {
    const error = new Error("boom");
    reportErrorPage("server_error", error, { digest: "abc" });

    expect(posthog.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        error_page_type: "server_error",
        digest: "abc",
      }),
    );
  });

  it("captures a view event when there is no error", () => {
    reportErrorPage("not_found");

    expect(posthog.capture).toHaveBeenCalledWith(
      "error_page_viewed",
      expect.objectContaining({ error_page_type: "not_found" }),
    );
  });

  it("never throws when telemetry fails", () => {
    (posthog.capture as jest.Mock).mockImplementationOnce(() => {
      throw new Error("posthog down");
    });
    expect(() => reportErrorPage("maintenance")).not.toThrow();
  });

  it("keeps the error page type even if context tries to override it", () => {
    const context = {
      error_page_type: "server_error",
    } as unknown as ErrorPageContext;
    reportErrorPage("not_found", undefined, context);

    expect(posthog.capture).toHaveBeenCalledWith(
      "error_page_viewed",
      expect.objectContaining({ error_page_type: "not_found" }),
    );
  });
});

describe("reportErrorPageOncePerSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("reports once per session for the same key", () => {
    reportErrorPageOncePerSession("maintenance", "scheduled");
    reportErrorPageOncePerSession("maintenance", "scheduled");

    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it("reports again for a different key", () => {
    reportErrorPageOncePerSession("maintenance", "scheduled");
    reportErrorPageOncePerSession("maintenance", "outage");

    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });
});
