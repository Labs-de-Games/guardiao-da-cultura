import posthog from "posthog-js";
import { captureOncePerSession } from "./captureOncePerSession";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

describe("captureOncePerSession", () => {
  beforeEach(() => {
    sessionStorage.clear();
    (posthog.capture as jest.Mock).mockClear();
  });

  it("captures the event on the first call", () => {
    captureOncePerSession("gameplay_started", { level_id: "level_01" });
    expect(posthog.capture).toHaveBeenCalledWith("gameplay_started", {
      level_id: "level_01",
    });
  });

  it("does not capture again on a second call in the same session", () => {
    captureOncePerSession("gameplay_started", { level_id: "level_01" });
    captureOncePerSession("gameplay_started", { level_id: "level_02" });

    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it("marks the session only after capturing", () => {
    // posthog-js discards a capture made before init() (the consent gate,
    // #864). Marking first would spend the session's one chance on an event
    // that never left the browser — the same class of silent loss as #899.
    let markedWhenCaptured: string | null = null;
    (posthog.capture as jest.Mock).mockImplementationOnce(() => {
      markedWhenCaptured = sessionStorage.getItem(
        "gp_session_once_gameplay_started",
      );
    });

    captureOncePerSession("gameplay_started");

    expect(markedWhenCaptured).toBeNull();
    expect(sessionStorage.getItem("gp_session_once_gameplay_started")).toBe(
      "1",
    );
  });

  it("tracks each event name independently", () => {
    captureOncePerSession("gameplay_started");
    captureOncePerSession("chapter_1_started");

    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });
});
