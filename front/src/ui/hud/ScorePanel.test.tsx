import { render } from "@testing-library/react";
import { formatScore, ScorePanel } from "./ScorePanel";

let mockScore = 0;

jest.mock("@/ui/state/game-ui-store", () => ({
  useGameUIStore: (selector: (state: { score: number }) => unknown) =>
    selector({ score: mockScore }),
  UI_Z_INDEX: { PANEL: 30 },
}));

jest.mock("@/game/constants/LayoutConfig", () => ({
  LayoutConfig: {
    COLORS: { MAP_BG: "#252726" },
  },
}));

jest.mock("@/ui/theme/tokens", () => ({
  GAME_UI_TOKENS: {
    colors: { textPrimary: "#f4eede", accentGold: "#d9ad56" },
    radius: { small: 8 },
  },
}));

beforeEach(() => {
  mockScore = 0;
});

describe("ScorePanel", () => {
  it("renders the Pontuação label", () => {
    const { getByText } = render(<ScorePanel />);
    expect(getByText("Pontuação:")).toBeTruthy();
  });

  it("shows initial score as 0", () => {
    const { getByText } = render(<ScorePanel />);
    expect(getByText("0")).toBeTruthy();
  });
});

describe("formatScore", () => {
  it("returns 0 for zero", () => {
    expect(formatScore(0)).toBe("0");
  });

  it("formats single digit", () => {
    expect(formatScore(5)).toBe("5");
  });

  it("formats number with dot separators", () => {
    expect(formatScore(18999)).toBe("18.999");
  });

  it("formats large numbers", () => {
    expect(formatScore(1000000)).toBe("1.000.000");
  });

  it("formats numbers under 1000 without dots", () => {
    expect(formatScore(999)).toBe("999");
  });

  it("formats exact thousands", () => {
    expect(formatScore(1000)).toBe("1.000");
  });
});
