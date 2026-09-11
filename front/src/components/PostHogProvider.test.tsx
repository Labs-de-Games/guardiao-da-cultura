import { render, screen, waitFor } from "@testing-library/react";
import {
  ANONYMOUS_PLAYER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
} from "../lib/edital/anonymousPlayer";
import { ANONYMOUS_PLAYER_CREATED_EVENT } from "../lib/edital/events";
import { PostHogProvider } from "./PostHogProvider";

const initMock = jest.fn();
const captureMock = jest.fn();

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) => initMock(...args),
    get_distinct_id: () => "test-distinct-id",
    get_property: () => undefined,
    capture: (...args: unknown[]) => captureMock(...args),
  },
}));

jest.mock("posthog-js/react", () => ({
  PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("../lib/env", () => ({
  env: {
    client: {
      apiUrl: "",
      posthogKey: "phc_test_key",
      posthogHost: "https://us.i.posthog.com",
      env: "development",
    },
  },
}));

describe("PostHogProvider", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    initMock.mockClear();
    captureMock.mockClear();
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    document.cookie = `${ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    window.localStorage.clear();
    global.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          // Never resolves within the test's synchronous assertions —
          // simulates a slow/awaited bootstrap fetch.
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ distinctId: "x", featureFlags: {} }),
              }),
            50,
          );
        }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("calls posthog.init synchronously, before the bootstrap fetch resolves", () => {
    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    // If init were still gated behind `await fetchBootstrap()`, this would
    // not have been called yet — the whole point of the structural fix in
    // discovery §5.2.
    expect(initMock).toHaveBeenCalledTimes(1);
  });

  it("renders children immediately without waiting on the fetch", () => {
    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("sends the durable cookie's id as a distinct_id query parameter", async () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("distinct_id=f47ac10b-58cc-4372-a567-0e02b2c3d479");
  });

  it("passes the cookie's id as the init-time bootstrap distinctID", () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    const [, options] = initMock.mock.calls[0];
    expect(
      (options as { bootstrap: { distinctID?: string } }).bootstrap.distinctID,
    ).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
  });

  it("captures anonymous_player_created when the cookie was freshly seeded", () => {
    document.cookie = `${ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME}=1; path=/`;

    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    expect(captureMock).toHaveBeenCalledWith(ANONYMOUS_PLAYER_CREATED_EVENT);
  });

  it("does not capture anonymous_player_created on a returning visit", () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

    render(
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>,
    );

    expect(captureMock).not.toHaveBeenCalledWith(
      ANONYMOUS_PLAYER_CREATED_EVENT,
    );
  });
});
