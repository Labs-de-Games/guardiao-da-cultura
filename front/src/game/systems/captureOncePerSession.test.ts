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

  it("tracks each event name independently", () => {
    captureOncePerSession("gameplay_started");
    captureOncePerSession("chapter_1_started");

    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });
});
