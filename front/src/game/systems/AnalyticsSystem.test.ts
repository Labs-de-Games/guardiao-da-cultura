import posthog from "posthog-js";
import { sendGameEvent } from "../../lib/analyticsApi";
import { GameEventType } from "../types/AnalyticsTypes";
import {
  __resetAbandonmentTrackingForTests,
  AnalyticsSystem,
} from "./AnalyticsSystem";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

jest.mock("../../lib/analyticsApi", () => ({
  sendGameEvent: jest.fn().mockResolvedValue(true),
}));

function makeScene(currentLevelId = "level_01") {
  const registryValues: Record<string, unknown> = {
    currentLevelId,
    userId: "user-1",
  };
  return {
    registry: { get: (key: string) => registryValues[key] },
    scene: { key: "GameScene" },
  } as unknown as import("phaser").Scene;
}

describe("AnalyticsSystem.setupAbandonmentTracking", () => {
  beforeEach(() => {
    __resetAbandonmentTrackingForTests();
    sessionStorage.clear();
    (posthog.capture as jest.Mock).mockClear();
    (sendGameEvent as jest.Mock).mockClear();
  });

  it("captures session_finished on pagehide", () => {
    const system = new AnalyticsSystem(makeScene());
    system.setupAbandonmentTracking();

    window.dispatchEvent(new Event("pagehide"));

    expect(posthog.capture).toHaveBeenCalledWith(
      "session_finished",
      expect.objectContaining({
        reason: "pagehide",
        last_level_id: "level_01",
      }),
      { transport: "sendBeacon" },
    );
  });

  it("only fires once even if multiple triggers fire", () => {
    const system = new AnalyticsSystem(makeScene());
    system.setupAbandonmentTracking();

    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("beforeunload"));

    const sessionFinishedCalls = (
      posthog.capture as jest.Mock
    ).mock.calls.filter(([eventName]) => eventName === "session_finished");
    expect(sessionFinishedCalls).toHaveLength(1);
  });

  it("installs the listeners at most once across multiple scene instances (per-level restart)", () => {
    const firstSystem = new AnalyticsSystem(makeScene("level_01"));
    firstSystem.setupAbandonmentTracking();

    // Simulates LevelCinematic.ts restarting the GAME scene and
    // constructing a brand-new AnalyticsSystem for level 2 — the
    // module-level guard must prevent a second listener set.
    const secondSystem = new AnalyticsSystem(makeScene("level_02"));
    secondSystem.setupAbandonmentTracking();

    window.dispatchEvent(new Event("pagehide"));

    const sessionFinishedCalls = (
      posthog.capture as jest.Mock
    ).mock.calls.filter(([eventName]) => eventName === "session_finished");
    expect(sessionFinishedCalls).toHaveLength(1);
  });

  it("also logs a legacy SESSION_END game_event", () => {
    const system = new AnalyticsSystem(makeScene());
    system.setupAbandonmentTracking();

    window.dispatchEvent(new Event("pagehide"));

    expect(sendGameEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: GameEventType.SESSION_END }),
    );
  });
});
