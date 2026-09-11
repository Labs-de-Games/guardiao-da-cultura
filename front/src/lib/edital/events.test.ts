import { PostHogStub } from "../posthogStub";
import {
  ANONYMOUS_PLAYER_CREATED_EVENT,
  captureAnonymousPlayerCreatedOnce,
} from "./events";

describe("captureAnonymousPlayerCreatedOnce", () => {
  const MARKER_KEY = "gp_anonymous_player_created_sent";

  afterEach(() => {
    window.localStorage.removeItem(MARKER_KEY);
  });

  it("captures the event when freshly seeded", () => {
    const client = new PostHogStub();
    jest.spyOn(client, "capture");

    captureAnonymousPlayerCreatedOnce(client, true);

    expect(client.capture).toHaveBeenCalledWith(ANONYMOUS_PLAYER_CREATED_EVENT);
  });

  it("does nothing when not freshly seeded", () => {
    const client = new PostHogStub();
    jest.spyOn(client, "capture");

    captureAnonymousPlayerCreatedOnce(client, false);

    expect(client.capture).not.toHaveBeenCalled();
  });

  it("only fires once per browser even across multiple calls", () => {
    const client = new PostHogStub();
    jest.spyOn(client, "capture");

    captureAnonymousPlayerCreatedOnce(client, true);
    captureAnonymousPlayerCreatedOnce(client, true);
    captureAnonymousPlayerCreatedOnce(client, true);

    expect(client.capture).toHaveBeenCalledTimes(1);
  });
});
