import { render } from "@testing-library/react";
import { ScorePanel } from "./ScorePanel";

let mockStars = 0;
let mockTotalStars = 0;

jest.mock("@/ui/state/game-ui-store", () => ({
  useGameUIStore: (
    selector: (state: { stars: number; totalStars: number }) => unknown,
  ) => selector({ stars: mockStars, totalStars: mockTotalStars }),
  UI_Z_INDEX: { PANEL: 30 },
}));

jest.mock("@/game/constants/LayoutConfig", () => ({
  LayoutConfig: {
    COLORS: { MAP_BG_CSS: "#252726" },
  },
}));

jest.mock("@/ui/theme/tokens", () => ({
  GAME_UI_TOKENS: {
    colors: { accentGold: "#d9ad56", textSecondary: "#a0a0a0" },
    radius: { small: 8 },
  },
}));

beforeEach(() => {
  mockStars = 0;
  mockTotalStars = 0;
});

describe("ScorePanel", () => {
  it("renders nothing when totalStars is 0", () => {
    const { container } = render(<ScorePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one star node per totalStars", () => {
    mockTotalStars = 5;
    mockStars = 2;
    const { getAllByText } = render(<ScorePanel />);
    expect(getAllByText("★")).toHaveLength(5);
  });

  it("marks stars at or below current stars as completed", () => {
    mockTotalStars = 3;
    mockStars = 2;
    const { getAllByText } = render(<ScorePanel />);
    const [star1, star2, star3] = getAllByText("★");

    expect(star1).toHaveStyle({ color: "#d9ad56" });
    expect(star2).toHaveStyle({ color: "#d9ad56" });
    expect(star3).toHaveStyle({ color: "#a0a0a0" });
  });
});
