import { GameEventType } from "../game/types/AnalyticsTypes";
import { clearConsent, writeConsent } from "./consent/consentStorage";

const post = jest.fn().mockResolvedValue({ data: {} });

jest.mock("./api/client", () => ({
  apiClient: {
    post: (...args: unknown[]) => post(...args),
  },
}));

const sendBeacon = jest.fn().mockReturnValue(true);

beforeAll(() => {
  Object.defineProperty(navigator, "sendBeacon", {
    configurable: true,
    value: sendBeacon,
  });
});

function payload(type: GameEventType) {
  return {
    userId: "u1",
    type,
    timestamp: "2026-01-01T00:00:00.000Z",
    metadata: {},
  };
}

describe("sendGameEvent — analytics consent (#864)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearConsent();
    post.mockClear();
    sendBeacon.mockClear();
  });

  it("sends nothing before the player has decided", async () => {
    const { sendGameEvent } = await import("./analyticsApi");

    const sent = await sendGameEvent(payload(GameEventType.BADGE_EARNED));

    expect(sent).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it("sends nothing when the player refused", async () => {
    writeConsent("declined");
    const { sendGameEvent } = await import("./analyticsApi");

    const sent = await sendGameEvent(payload(GameEventType.BADGE_EARNED));

    expect(sent).toBe(false);
    expect(post).not.toHaveBeenCalled();
  });

  it("sends once the player accepted", async () => {
    writeConsent("accepted");
    const { sendGameEvent } = await import("./analyticsApi");

    const sent = await sendGameEvent(payload(GameEventType.BADGE_EARNED));

    expect(sent).toBe(true);
    expect(post).toHaveBeenCalledWith("/events", expect.anything());
  });

  it("does not fire the session.end beacon without consent", async () => {
    writeConsent("declined");
    const { sendGameEvent } = await import("./analyticsApi");

    // session.end takes the sendBeacon branch, which bypasses apiClient
    // entirely — it needs the guard just as much as the axios path.
    await sendGameEvent(payload(GameEventType.SESSION_END));

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("still fires the session.end beacon with consent", async () => {
    writeConsent("accepted");
    const { sendGameEvent } = await import("./analyticsApi");

    await sendGameEvent(payload(GameEventType.SESSION_END));

    expect(sendBeacon).toHaveBeenCalled();
  });
});
