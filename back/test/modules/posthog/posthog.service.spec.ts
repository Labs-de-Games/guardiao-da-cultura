import { Logger } from "@nestjs/common";
import type { ConfigService } from "../../../src/core/config/config.service";
import { PostHogService } from "../../../src/modules/posthog/posthog.service";

const mockCapture = jest.fn();
const mockCaptureException = jest.fn();
const mockGetAllFlags = jest.fn();
jest.mock("posthog-node", () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: mockCapture,
    captureException: mockCaptureException,
    getAllFlags: mockGetAllFlags,
    shutdown: jest.fn(),
  })),
}));

function makeService(
  appEnv: string,
  nodeEnv = "production",
  posthogApiKey = "phc_test",
): PostHogService {
  const config = {
    posthogApiKey,
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

describe("PostHogService — guest_play_enabled kill switch (#880)", () => {
  beforeEach(() => {
    mockGetAllFlags.mockReset();
  });

  it("is unknown and fail-closed when there is no PostHog client", async () => {
    const service = makeService("staging", "production", "");

    expect(await service.getGuestPlayFlag()).toBeUndefined();
    expect(await service.isGuestPlayEnabled()).toBe(false);
    expect(mockGetAllFlags).not.toHaveBeenCalled();
  });

  it("is unknown and fail-closed when the PostHog call fails", async () => {
    mockGetAllFlags.mockRejectedValue(new Error("network down"));
    const service = makeService("staging");
    const logError = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    expect(await service.getGuestPlayFlag()).toBeUndefined();
    expect(await service.isGuestPlayEnabled()).toBe(false);
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });

  it("is unknown and fail-closed when the flag is not defined", async () => {
    mockGetAllFlags.mockResolvedValue({});
    const service = makeService("staging");

    expect(await service.getGuestPlayFlag()).toBeUndefined();
    expect(await service.isGuestPlayEnabled()).toBe(false);
  });

  it("is unknown when the flag is not a boolean", async () => {
    mockGetAllFlags.mockResolvedValue({ guest_play_enabled: "variant-a" });

    expect(await makeService("staging").getGuestPlayFlag()).toBeUndefined();
  });

  it("passes an explicit false through", async () => {
    mockGetAllFlags.mockResolvedValue({ guest_play_enabled: false });
    const service = makeService("staging");

    expect(await service.getGuestPlayFlag()).toBe(false);
    expect(await service.isGuestPlayEnabled()).toBe(false);
  });

  it("passes an explicit true through", async () => {
    mockGetAllFlags.mockResolvedValue({ guest_play_enabled: true });
    const service = makeService("staging");

    expect(await service.getGuestPlayFlag()).toBe(true);
    expect(await service.isGuestPlayEnabled()).toBe(true);
  });

  it("evaluates the flag under the server id, never a player id", async () => {
    mockGetAllFlags.mockResolvedValue({ guest_play_enabled: true });

    await makeService("staging").getGuestPlayFlag();

    expect(mockGetAllFlags).toHaveBeenCalledWith("nestjs-server");
  });

  it("caches the answer, including an unknown one", async () => {
    mockGetAllFlags.mockResolvedValue({});
    const service = makeService("staging");

    await service.getGuestPlayFlag();
    await service.isGuestPlayEnabled();

    expect(mockGetAllFlags).toHaveBeenCalledTimes(1);
  });

  it("is always enabled in development without asking PostHog", async () => {
    const service = makeService("local", "development");

    expect(await service.getGuestPlayFlag()).toBe(true);
    expect(mockGetAllFlags).not.toHaveBeenCalled();
  });
});
