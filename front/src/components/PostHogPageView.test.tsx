import { render } from "@testing-library/react";
import { PostHogReadyProvider } from "@/lib/posthog/PostHogReadyContext";
import PostHogPageView from "./PostHogPageView";

const captureMock = jest.fn();
let pathname = "/";

jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));

// One stable object, as posthog-js/react gives: it rebuilds its context value
// on every render but memoizes the client itself. That stability is what makes
// `usePostHog()` useless as a readiness signal — the dependency never changes,
// so the effect never re-runs after init (issue #899).
const clientMock = {
  capture: (...args: unknown[]) => captureMock(...args),
};

jest.mock("posthog-js/react", () => ({
  usePostHog: () => clientMock,
}));

function pageviews() {
  return captureMock.mock.calls.filter(([event]) => event === "$pageview");
}

function renderPageView(ready: boolean) {
  return render(
    <PostHogReadyProvider ready={ready}>
      <PostHogPageView />
    </PostHogReadyProvider>,
  );
}

describe("PostHogPageView", () => {
  beforeEach(() => {
    captureMock.mockClear();
    pathname = "/";
  });

  it("sends nothing before PostHog is initialized", () => {
    // Consent used to be the guard here, and it flips one commit too early:
    // this effect re-ran while the singleton was still uninitialized, so the
    // first pageview of every consenting session was discarded (#899).
    renderPageView(false);
    expect(pageviews()).toHaveLength(0);
  });

  it("sends the pending pageview when PostHog becomes ready", () => {
    const { rerender } = renderPageView(false);

    rerender(
      <PostHogReadyProvider ready={true}>
        <PostHogPageView />
      </PostHogReadyProvider>,
    );

    expect(pageviews()).toHaveLength(1);
    expect(pageviews()[0][1]).toEqual({
      $current_url: `${window.origin}/`,
    });
  });

  it("does not repeat the pageview when the provider re-renders", () => {
    const { rerender } = renderPageView(true);

    rerender(
      <PostHogReadyProvider ready={true}>
        <PostHogPageView />
      </PostHogReadyProvider>,
    );

    expect(pageviews()).toHaveLength(1);
  });

  it("sends another pageview on navigation", () => {
    const { rerender } = renderPageView(true);
    expect(pageviews()).toHaveLength(1);

    pathname = "/game";
    rerender(
      <PostHogReadyProvider ready={true}>
        <PostHogPageView />
      </PostHogReadyProvider>,
    );

    expect(pageviews()).toHaveLength(2);
    expect(pageviews()[1][1]).toEqual({
      $current_url: `${window.origin}/game`,
    });
  });
});
