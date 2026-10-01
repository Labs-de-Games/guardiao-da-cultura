import { fireEvent, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { PostHogReadyProvider } from "@/lib/posthog/PostHogReadyContext";
import PlayLanding from "./PlayLanding";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

/**
 * `landing_page_viewed` waits for PostHog to be initialized (issue #899), so
 * every test that expects it has to say so — `ready` is false by default, which
 * is what a player who has not accepted sees.
 */
function renderLanding(ready = true) {
  return render(
    <PostHogReadyProvider ready={ready}>
      <PlayLanding />
    </PostHogReadyProvider>,
  );
}

function landingViewCalls() {
  return (posthog.capture as jest.Mock).mock.calls.filter(
    ([eventName]) => eventName === "landing_page_viewed",
  );
}

describe("PlayLanding", () => {
  beforeEach(() => {
    (posthog.capture as jest.Mock).mockClear();
    pushMock.mockClear();
  });

  it("captures landing_page_viewed once PostHog is ready, with referrer", () => {
    renderLanding();
    expect(posthog.capture).toHaveBeenCalledWith(
      "landing_page_viewed",
      expect.objectContaining({ referrer: expect.any(String) }),
    );
  });

  it("does not capture landing_page_viewed before PostHog is initialized", () => {
    // The regression behind #899: posthog-js discards a pre-init capture
    // instead of queueing it, so firing here loses the funnel's first step for
    // good — the effect never runs again.
    renderLanding(false);
    expect(landingViewCalls()).toHaveLength(0);
  });

  it("captures landing_page_viewed when PostHog becomes ready later", () => {
    // The real sequence for every player: the page mounts while consent is
    // still being read from localStorage, and init only lands afterwards.
    const { rerender } = renderLanding(false);
    expect(landingViewCalls()).toHaveLength(0);

    rerender(
      <PostHogReadyProvider ready={true}>
        <PlayLanding />
      </PostHogReadyProvider>,
    );

    expect(landingViewCalls()).toHaveLength(1);
  });

  it("captures landing_page_viewed only once across later re-renders", () => {
    const { rerender } = renderLanding();

    rerender(
      <PostHogReadyProvider ready={true}>
        <PlayLanding />
      </PostHogReadyProvider>,
    );

    expect(landingViewCalls()).toHaveLength(1);
  });

  it("renders the footer below the hero", () => {
    renderLanding();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByAltText("Lei Rouanet")).toBeInTheDocument();
  });

  it("dual-emits both the legacy and canonical click events", () => {
    renderLanding();
    fireEvent.click(screen.getByText("Jogar"));

    expect(posthog.capture).toHaveBeenCalledWith("landing_page_play_clicked");
    expect(posthog.capture).toHaveBeenCalledWith(
      "play_clicked",
      expect.objectContaining({ dwell_ms: expect.any(Number) }),
    );
  });

  it("navigates to /game on click", () => {
    renderLanding();
    fireEvent.click(screen.getByText("Jogar"));
    expect(pushMock).toHaveBeenCalledWith("/game");
  });

  it("captures landing_page_dwell_time on pagehide", () => {
    const { unmount } = renderLanding();
    (posthog.capture as jest.Mock).mockClear();

    fireEvent(window, new Event("pagehide"));

    expect(posthog.capture).toHaveBeenCalledWith(
      "landing_page_dwell_time",
      expect.objectContaining({ dwell_ms: expect.any(Number) }),
    );
    unmount();
  });

  it("only sends dwell time once even if both pagehide and unmount fire", () => {
    const { unmount } = renderLanding();
    (posthog.capture as jest.Mock).mockClear();

    fireEvent(window, new Event("pagehide"));
    unmount();

    const dwellCalls = (posthog.capture as jest.Mock).mock.calls.filter(
      ([eventName]) => eventName === "landing_page_dwell_time",
    );
    expect(dwellCalls).toHaveLength(1);
  });

  it("captures landing_page_dwell_time on unmount when no pagehide/visibilitychange fired", () => {
    const { unmount } = renderLanding();
    (posthog.capture as jest.Mock).mockClear();

    unmount();

    expect(posthog.capture).toHaveBeenCalledWith(
      "landing_page_dwell_time",
      expect.objectContaining({ dwell_ms: expect.any(Number) }),
    );
  });
});
