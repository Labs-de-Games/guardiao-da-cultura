import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConsentGate } from "@/components/consent/ConsentGate";
import { ConsentProvider } from "@/lib/consent/ConsentContext";
import { writeConsent } from "@/lib/consent/consentStorage";
import PlayLanding from "./PlayLanding";
import { PostHogProvider } from "./PostHogProvider";

/**
 * Issue #899 end-to-end, through the real provider stack: `landing_page_viewed`
 * is the edital funnel's first step, and `windowFunnel` is strictly ordered, so
 * losing it zeroes every step after it and the Funil page shows its empty state
 * no matter how far players actually got.
 *
 * `initialized` is the point of this file. The posthog-js mocks elsewhere are
 * plain `jest.fn()`s that happily record a capture the real library would have
 * discarded, so asserting "capture was called" passes against the broken code
 * too. What has to be asserted is that the capture happened *after* `init()`.
 */
let initialized = false;
/**
 * Mirrors posthog-js: `init()` runs the `loaded:` callback synchronously before
 * returning (non-Segment path). PostHogProvider sets readiness from inside that
 * callback, so a mock that skipped it would make this whole file vacuous.
 */
const initMock = jest.fn(
  (_key: string, options?: { loaded?: (ph: unknown) => void }) => {
    initialized = true;
    options?.loaded?.(posthogMockInstance);
  },
);
const captureMock = jest.fn();
/** Whether PostHog was initialized at the moment of each capture. */
const captureSawInit: Array<{ event: string; initialized: boolean }> = [];

const posthogMockInstance = {
  debug: jest.fn(),
  register: jest.fn(),
  get_distinct_id: () => "test-distinct-id",
  get_property: () => undefined,
  capture: (...args: unknown[]) => captureMock(...args),
};

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: (...args: unknown[]) =>
      initMock(
        args[0] as string,
        args[1] as { loaded?: (ph: unknown) => void } | undefined,
      ),
    debug: jest.fn(),
    register: jest.fn(),
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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderStack() {
  return render(
    <ConsentProvider>
      <PostHogProvider>
        <PlayLanding />
        <ConsentGate />
      </PostHogProvider>
    </ConsentProvider>,
  );
}

function landingViews() {
  return captureSawInit.filter((call) => call.event === "landing_page_viewed");
}

describe("landing_page_viewed survives the consent gate (#899)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    initialized = false;
    initMock.mockClear();
    captureMock.mockClear();
    captureSawInit.length = 0;
    captureMock.mockImplementation((event: string) => {
      captureSawInit.push({ event, initialized });
    });
    window.localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ distinctId: "x", featureFlags: {} }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("captures it for a player who accepted on an earlier visit", async () => {
    writeConsent("accepted");

    renderStack();

    await waitFor(() => expect(initMock).toHaveBeenCalled());
    await waitFor(() => expect(landingViews()).toHaveLength(1));
    // The whole bug: before #899 this capture ran one commit too early, while
    // the posthog-js singleton was still uninitialized, and was discarded.
    expect(landingViews()[0].initialized).toBe(true);
  });

  it("captures it for a first-time player who accepts on the landing page", async () => {
    renderStack();

    // The dialog blocks the page, so this is where every campaign player
    // starts — and where the event used to be lost for good.
    fireEvent.click(
      await screen.findByRole("button", { name: "Aceitar dados de uso" }),
    );

    await waitFor(() => expect(initMock).toHaveBeenCalled());
    await waitFor(() => expect(landingViews()).toHaveLength(1));
    expect(landingViews()[0].initialized).toBe(true);
  });

  it("never captures it for a player who refuses", async () => {
    renderStack();

    fireEvent.click(
      await screen.findByRole("button", { name: "Continuar sem dados de uso" }),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(initMock).not.toHaveBeenCalled();
    expect(landingViews()).toHaveLength(0);
  });
});
