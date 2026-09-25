import type { CaptureResult } from "posthog-js";
import { PostHogStub } from "../posthogStub";
import { createBeforeSend } from "./beforeSend";

function makeEvent(properties: Record<string, unknown> = {}): CaptureResult {
  return {
    uuid: "test-uuid",
    event: "test_event",
    properties,
  } as CaptureResult;
}

describe("createBeforeSend", () => {
  it("stamps anonymous_player_id from the client distinct id when missing", () => {
    const client = new PostHogStub();
    const beforeSend = createBeforeSend(client);

    const result = beforeSend(makeEvent());

    expect(result?.properties.anonymous_player_id).toBe(
      client.get_distinct_id(),
    );
  });

  it("does not overwrite an existing anonymous_player_id", () => {
    const client = new PostHogStub();
    const beforeSend = createBeforeSend(client);

    const result = beforeSend(makeEvent({ anonymous_player_id: "explicit" }));

    expect(result?.properties.anonymous_player_id).toBe("explicit");
  });

  it("stamps campaign_source from the registered super property when missing", () => {
    const client = new PostHogStub();
    client.register({ campaign_source: "escola-teste" });
    const beforeSend = createBeforeSend(client);

    const result = beforeSend(makeEvent());

    expect(result?.properties.campaign_source).toBe("escola-teste");
  });

  it("passes null through untouched", () => {
    const client = new PostHogStub();
    const beforeSend = createBeforeSend(client);

    expect(beforeSend(null)).toBeNull();
  });

  it("never throws, even if the client is broken", () => {
    const brokenClient = {
      get_distinct_id: () => {
        throw new Error("boom");
      },
      get_property: () => {
        throw new Error("boom");
      },
    } as unknown as PostHogStub;
    const beforeSend = createBeforeSend(brokenClient);
    const event = makeEvent();

    expect(() => beforeSend(event)).not.toThrow();
    expect(beforeSend(event)).toBe(event);
  });
});
