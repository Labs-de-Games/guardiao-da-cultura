import type { ConfigService } from "../../../src/core/config/config.service";
import { PostHogService } from "../../../src/modules/posthog/posthog.service";

const mockCapture = jest.fn();
const mockCaptureException = jest.fn();
jest.mock("posthog-node", () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    captureException: mockCaptureException,
    shutdown: jest.fn(),
  })),
}));

function makeService(appEnv: string, nodeEnv = "production"): PostHogService {
  const config = {
    posthogApiKey: "phc_test",
    posthogHost: "https://us.i.posthog.com",
    appEnv,
    nodeEnv,
  } as unknown as ConfigService;
  return new PostHogService(config);
}

describe("PostHogService — environment tag", () => {
  beforeEach(() => {
    mockCapture.mockReset();
    mockCaptureException.mockReset();
  });

  it("tags events with APP_ENV, not NODE_ENV (staging runs NODE_ENV=production)", () => {
    makeService("staging").capture({
      event: "user_registered",
      consent: true,
      distinctId: "u1",
      properties: { method: "password" },
    });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "user_registered",
        properties: { method: "password", environment: "staging" },
      }),
    );
  });

  it("tags production events as production", () => {
    makeService("production").capture({
      event: "user_logged_in",
      consent: true,
    });

    expect(mockCapture.mock.calls[0][0].properties.environment).toBe(
      "production",
    );
  });

  it("tags exceptions with APP_ENV too", () => {
    const error = new Error("boom");
    makeService("staging").captureException(
      error,
      "u1",
      { area: "auth" },
      true,
    );

    expect(mockCaptureException).toHaveBeenCalledWith(error, "u1", {
      area: "auth",
      environment: "staging",
    });
  });

  describe("analytics consent (#864)", () => {
    it("does not send an event when the player has not consented", () => {
      makeService("production").capture({
        event: "match_ended",
        consent: false,
        distinctId: "u1",
      });

      expect(mockCapture).not.toHaveBeenCalled();
    });

    it("does not send an exception when the player has not consented", () => {
      makeService("production").captureException(
        new Error("boom"),
        "u1",
        undefined,
        false,
      );

      expect(mockCaptureException).not.toHaveBeenCalled();
    });

    it("never forwards the consent flag as an event property", () => {
      makeService("production").capture({
        event: "match_ended",
        consent: true,
        distinctId: "u1",
        properties: { level_id: "level-1" },
      });

      const payload = mockCapture.mock.calls[0][0];
      expect(payload).not.toHaveProperty("consent");
      expect(payload.properties).not.toHaveProperty("consent");
    });
  });
});
