import { act, render, screen } from "@testing-library/react";
import { useFeatureFlag } from "@/lib/posthog/FeatureFlagContext";
import PlayerGuard from "./PlayerGuard";

jest.mock("@/lib/posthog/FeatureFlagContext", () => ({
  useFeatureFlag: jest.fn(),
}));

jest.mock("@/components/LoadingScreen", () => ({
  __esModule: true,
  default: () => <div>loading-screen</div>,
}));

const FLAG_TIMEOUT_MS = 5000;

function renderGuard() {
  return render(
    <PlayerGuard>
      <div>game content</div>
    </PlayerGuard>,
  );
}

describe("PlayerGuard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (useFeatureFlag as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders children right away when guest play is enabled", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue(true);

    renderGuard();

    expect(screen.getByText("game content")).toBeInTheDocument();
  });

  it("keeps blocking when guest play is explicitly disabled", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue(false);

    renderGuard();
    act(() => {
      jest.advanceTimersByTime(FLAG_TIMEOUT_MS * 2);
    });

    expect(screen.getByText("loading-screen")).toBeInTheDocument();
    expect(screen.queryByText("game content")).toBeNull();
  });

  it("lets the player in after the timeout when the flag is unknown (#880)", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue(undefined);

    renderGuard();
    expect(screen.getByText("loading-screen")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(FLAG_TIMEOUT_MS);
    });

    expect(screen.getByText("game content")).toBeInTheDocument();
  });
});
