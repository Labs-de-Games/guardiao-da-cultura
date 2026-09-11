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

  it("captures landing_page_viewed on mount", () => {
    render(<PlayLanding />);
    expect(posthog.capture).toHaveBeenCalledWith("landing_page_viewed");
  });

  it("dual-emits both the legacy and canonical click events", () => {
    render(<PlayLanding />);
    fireEvent.click(screen.getByText("Jogar"));

    expect(posthog.capture).toHaveBeenCalledWith("landing_page_play_clicked");
    expect(posthog.capture).toHaveBeenCalledWith("play_clicked");
  });

  it("navigates to /game on click", () => {
    render(<PlayLanding />);
    fireEvent.click(screen.getByText("Jogar"));
    expect(pushMock).toHaveBeenCalledWith("/game");
  });
});
