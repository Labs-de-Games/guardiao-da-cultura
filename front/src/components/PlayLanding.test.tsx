import { fireEvent, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
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

describe("PlayLanding", () => {
  beforeEach(() => {
    (posthog.capture as jest.Mock).mockClear();
    pushMock.mockClear();
  });

  it("captures landing_page_viewed on mount, with referrer", () => {
    render(<PlayLanding />);
    expect(posthog.capture).toHaveBeenCalledWith(
      "landing_page_viewed",
      expect.objectContaining({ referrer: expect.any(String) }),
    );
  });

  it("dual-emits both the legacy and canonical click events", () => {
    render(<PlayLanding />);
    fireEvent.click(screen.getByText("Jogar"));

    expect(posthog.capture).toHaveBeenCalledWith("landing_page_play_clicked");
    expect(posthog.capture).toHaveBeenCalledWith(
      "play_clicked",
      expect.objectContaining({ dwell_ms: expect.any(Number) }),
    );
  });

  it("navigates to /game on click", () => {
    render(<PlayLanding />);
    fireEvent.click(screen.getByText("Jogar"));
    expect(pushMock).toHaveBeenCalledWith("/game");
  });

  it("captures landing_page_dwell_time on pagehide", () => {
    const { unmount } = render(<PlayLanding />);
    (posthog.capture as jest.Mock).mockClear();

    fireEvent(window, new Event("pagehide"));

    expect(posthog.capture).toHaveBeenCalledWith(
      "landing_page_dwell_time",
      expect.objectContaining({ dwell_ms: expect.any(Number) }),
    );
    unmount();
  });

  it("only sends dwell time once even if both pagehide and unmount fire", () => {
    const { unmount } = render(<PlayLanding />);
    (posthog.capture as jest.Mock).mockClear();

    fireEvent(window, new Event("pagehide"));
    unmount();

    const dwellCalls = (posthog.capture as jest.Mock).mock.calls.filter(
      ([eventName]) => eventName === "landing_page_dwell_time",
    );
    expect(dwellCalls).toHaveLength(1);
  });

  it("captures landing_page_dwell_time on unmount when no pagehide/visibilitychange fired", () => {
    const { unmount } = render(<PlayLanding />);
    (posthog.capture as jest.Mock).mockClear();

    unmount();

    expect(posthog.capture).toHaveBeenCalledWith(
      "landing_page_dwell_time",
      expect.objectContaining({ dwell_ms: expect.any(Number) }),
    );
  });
});
