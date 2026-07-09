import { render } from "@testing-library/react";
import { ScorePanel } from "./ScorePanel";

jest.mock("@/ui/state/game-ui-store", () => ({
  useGameUIStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({}),
  UI_Z_INDEX: { PANEL: 30 },
}));

jest.mock("@/game/constants/LayoutConfig", () => ({
  LayoutConfig: {
    COLORS: { MAP_BG_CSS: "#252726" },
  },
}));

jest.mock("@/ui/theme/tokens", () => ({
  GAME_UI_TOKENS: {
    colors: { textPrimary: "#f4eede", accentGold: "#d9ad56" },
    radius: { small: 8 },
  },
}));

describe("ScorePanel", () => {
  it("renders without crashing", () => {
    const { container } = render(<ScorePanel />);
    expect(container.firstChild).toBeTruthy();
  });
});
