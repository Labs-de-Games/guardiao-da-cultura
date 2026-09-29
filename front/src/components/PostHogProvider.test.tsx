import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { ConsentProvider, useConsent } from "../lib/consent/ConsentContext";
import {
  CONSENT_STORAGE_KEY,
  writeConsent,
} from "../lib/consent/consentStorage";
import {
  ANONYMOUS_PLAYER_COOKIE_NAME,
  ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME,
} from "../lib/edital/anonymousPlayer";
import { ANONYMOUS_PLAYER_CREATED_EVENT } from "../lib/edital/events";
import { useFeatureFlag } from "../lib/posthog/FeatureFlagContext";
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

/**
 * PostHog only initializes once the player has accepted (issue #864), so the
 * behaviour these tests describe is all post-consent. The pre-consent
 * behaviour has its own describe block at the bottom.
 */
function renderAccepted() {
  writeConsent("accepted");
  return render(
    <ConsentProvider>
      <PostHogProvider>
        <div>child</div>
      </PostHogProvider>
    </ConsentProvider>,
  );
}

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

  it("calls posthog.init without waiting on the bootstrap fetch", async () => {
    renderAccepted();

    // If init were still gated behind `await fetchBootstrap()`, this would
    // not have been called yet — the whole point of the structural fix in
    // discovery §5.2. The fetch mock above never resolves in time.
    await waitFor(() => expect(initMock).toHaveBeenCalledTimes(1));
  });

  it("renders children immediately without waiting on the fetch", () => {
    renderAccepted();

    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("renders children immediately before any choice is made too", () => {
    render(
      <ConsentProvider>
        <PostHogProvider>
          <div>child</div>
        </PostHogProvider>
      </ConsentProvider>,
    );

    // The banner must never delay the game.
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("sends the durable cookie's id as a distinct_id query parameter", async () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

    renderAccepted();

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain("distinct_id=f47ac10b-58cc-4372-a567-0e02b2c3d479");
  });

  it("passes the cookie's id as the init-time bootstrap distinctID", async () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

    renderAccepted();

    await waitFor(() => expect(initMock).toHaveBeenCalled());
    const [, options] = initMock.mock.calls[0];
    expect(
      (options as { bootstrap: { distinctID?: string } }).bootstrap.distinctID,
    ).toBe("f47ac10b-58cc-4372-a567-0e02b2c3d479");
  });

  it("captures anonymous_player_created when the cookie was freshly seeded", async () => {
    document.cookie = `${ANONYMOUS_PLAYER_SEEDED_MARKER_COOKIE_NAME}=1; path=/`;

    renderAccepted();

    await waitFor(() =>
      expect(captureMock).toHaveBeenCalledWith(ANONYMOUS_PLAYER_CREATED_EVENT),
    );
  });

  it("does not capture anonymous_player_created on a returning visit", async () => {
    document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

    renderAccepted();

    await waitFor(() => expect(initMock).toHaveBeenCalled());
    expect(captureMock).not.toHaveBeenCalledWith(
      ANONYMOUS_PLAYER_CREATED_EVENT,
    );
  });

  describe("before the player consents (#864)", () => {
    function renderUndecided() {
      window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      return render(
        <ConsentProvider>
          <PostHogProvider>
            <div>child</div>
          </PostHogProvider>
        </ConsentProvider>,
      );
    }

    it("never initializes PostHog", async () => {
      renderUndecided();

      // The bootstrap fetch still fires, so waiting on it is a real wait —
      // init has genuinely not happened, rather than not happened yet.
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(initMock).not.toHaveBeenCalled();
    });

    it("withholds the player's distinct id from the bootstrap request", async () => {
      document.cookie = `${ANONYMOUS_PLAYER_COOKIE_NAME}=f47ac10b-58cc-4372-a567-0e02b2c3d479; path=/`;

      renderUndecided();

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).not.toContain("distinct_id=");
    });

    it("still resolves feature flags, so the game is not blocked", async () => {
      renderUndecided();
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    });

    it("does not initialize after an explicit refusal either", async () => {
      writeConsent("declined");

      render(
        <ConsentProvider>
          <PostHogProvider>
            <div>child</div>
          </PostHogProvider>
        </ConsentProvider>,
      );

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(initMock).not.toHaveBeenCalled();
    });
  });

  it("never enables session replay or canvas recording", async () => {
    renderAccepted();

    await waitFor(() => expect(initMock).toHaveBeenCalled());
    const [, options] = initMock.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(options.record_sessions_percent).toBeUndefined();
    expect(options.record_canvas).toBeUndefined();
    expect(options.disable_session_recording).toBe(true);
  });

  it("never remounts its children when the client appears", async () => {
    // Regression: the component used to return a bare tree while `client`
    // was null and a <PHProvider>-wrapped one afterwards. That is a different
    // element type at the same position, so React tore the subtree down and
    // rebuilt it — destroying the Phaser game ConsentGuard had just mounted
    // and crashing its in-flight audio tween on a freed sound.
    const mounts = jest.fn();
    const unmounts = jest.fn();

    function Child() {
      useEffect(() => {
        mounts();
        return () => unmounts();
      }, []);
      return <div>child</div>;
    }

    writeConsent("accepted");
    render(
      <ConsentProvider>
        <PostHogProvider>
          <Child />
        </PostHogProvider>
      </ConsentProvider>,
    );

    // Wait past the point where the client is swapped in.
    await waitFor(() => expect(initMock).toHaveBeenCalled());
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(mounts).toHaveBeenCalledTimes(1);
    expect(unmounts).not.toHaveBeenCalled();
  });

  it("does not remount children when consent flips from undecided to accepted", async () => {
    const mounts = jest.fn();
    const unmounts = jest.fn();

    function Child() {
      useEffect(() => {
        mounts();
        return () => unmounts();
      }, []);
      return <div>child</div>;
    }

    function Harness() {
      const { state, accept } = useConsent();
      return (
        <PostHogProvider>
          <button type="button" onClick={accept}>
            aceitar
          </button>
          <span>{state}</span>
          <Child />
        </PostHogProvider>
      );
    }

    render(
      <ConsentProvider>
        <Harness />
      </ConsentProvider>,
    );

    await screen.findByText("undecided");
    expect(mounts).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "aceitar" }));

    await waitFor(() => expect(initMock).toHaveBeenCalled());
    expect(unmounts).not.toHaveBeenCalled();
    expect(mounts).toHaveBeenCalledTimes(1);
  });

  it("keeps working flags when the post-consent bootstrap retry fails", async () => {
    // The bootstrap effect runs again when consent flips. A failed retry must
    // not clear flags that already resolved: PlayerGuard would swap the
    // running game for a LoadingScreen and unmount a live Phaser instance.
    let call = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      call += 1;
      if (call === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            distinctId: "x",
            featureFlags: { guest_play_enabled: true },
          }),
        });
      }
      return Promise.reject(new Error("network blip"));
    });

    function Flags() {
      const flag = useFeatureFlag("guest_play_enabled");
      return <span>flag:{String(flag)}</span>;
    }

    function Harness() {
      const { accept } = useConsent();
      return (
        <PostHogProvider>
          <button type="button" onClick={accept}>
            aceitar
          </button>
          <Flags />
        </PostHogProvider>
      );
    }

    render(
      <ConsentProvider>
        <Harness />
      </ConsentProvider>,
    );

    await screen.findByText("flag:true");

    fireEvent.click(screen.getByRole("button", { name: "aceitar" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByText("flag:true")).toBeInTheDocument();
  });
});
