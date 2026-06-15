import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { BadgeConfig } from "../../lib/badgesApi";
import { useGameUIStore } from "../state/game-ui-store";
import BadgeGalleryPanel from "./BadgeGalleryPanel";

const MOCK_BADGES: BadgeConfig[] = [
  {
    id: "badge_explorador",
    name: "Explorador",
    description: "Inspecionou todos os objetos.",
    stat_required: "objects_inspected",
    condition: ">=",
    goal_value: 10,
    icon_key: "badge_explorer",
  },
  {
    id: "badge_restaurador",
    name: "Restaurador",
    description: "Resolveu sem erros.",
    stat_required: "puzzles_solved_flawlessly",
    condition: ">=",
    goal_value: 1,
    icon_key: "badge_restorer",
  },
  {
    id: "badge_curador",
    name: "Curador",
    description: "Acertou 100% do quiz.",
    stat_required: "quiz_perfect_score",
    condition: "==",
    goal_value: 1,
    icon_key: "badge_curator",
  },
];

function resetStore() {
  useGameUIStore.setState({
    badgeGalleryOpen: false,
    badges: [],
    unlockedBadgeIds: [],
    badgeError: null,
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe("BadgeGalleryPanel", () => {
  it("returns null when closed", () => {
    const { container } = render(<BadgeGalleryPanel />);
    expect(container.innerHTML).toBe("");
  });

  it("renders badges from store when open", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: MOCK_BADGES,
        unlockedBadgeIds: ["badge_explorador"],
      });
    });

    render(<BadgeGalleryPanel />);

    expect(screen.getByText("Explorador")).toBeDefined();
    expect(screen.getByText("Restaurador")).toBeDefined();
    expect(screen.getByText("Curador")).toBeDefined();
  });

  it("shows earned badge icon and locked badge question mark", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: MOCK_BADGES,
        unlockedBadgeIds: ["badge_explorador"],
      });
    });

    const { container } = render(<BadgeGalleryPanel />);

    const images = container.querySelectorAll("img");
    expect(images.length).toBe(1);
    expect(images[0].getAttribute("src")).toContain("badge_explorer");

    const questionMarks = screen.getAllByText("?");
    expect(questionMarks.length).toBe(2);
  });

  it("calls setBadgeGalleryOpen(false) on close button click", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: MOCK_BADGES,
        unlockedBadgeIds: [],
      });
    });

    render(<BadgeGalleryPanel />);

    act(() => {
      fireEvent.click(screen.getByLabelText("Fechar galeria"));
    });

    expect(useGameUIStore.getState().badgeGalleryOpen).toBe(false);
  });

  it("shows gallery title", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: MOCK_BADGES,
        unlockedBadgeIds: [],
      });
    });

    render(<BadgeGalleryPanel />);
    expect(screen.getByText("Galeria de Conquistas")).toBeDefined();
  });

  it("renders empty grid when no badges in store", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: [],
        unlockedBadgeIds: [],
      });
    });

    const { container } = render(<BadgeGalleryPanel />);
    expect(screen.getByText("Galeria de Conquistas")).toBeDefined();
    expect(container.querySelectorAll("img").length).toBe(0);
  });

  it("shows error message when badgeError is set", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: [],
        unlockedBadgeIds: [],
        badgeError: "Nao foi possivel carregar as conquistas.",
      });
    });

    render(<BadgeGalleryPanel />);
    expect(
      screen.getByText("Nao foi possivel carregar as conquistas."),
    ).toBeDefined();
    expect(screen.getByText("Tentar novamente")).toBeDefined();
  });

  it("hides error when gallery closes", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: [],
        unlockedBadgeIds: [],
        badgeError: "some error",
      });
    });

    const { rerender } = render(<BadgeGalleryPanel />);
    expect(screen.getByText("some error")).toBeDefined();

    act(() => {
      useGameUIStore.getState().setBadgeGalleryOpen(false);
    });
    rerender(<BadgeGalleryPanel />);
    expect(screen.queryByText("some error")).toBeNull();
  });

  it("addUnlockedBadge updates store and triggers re-render", async () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: MOCK_BADGES,
        unlockedBadgeIds: [],
      });
    });

    const { rerender } = render(<BadgeGalleryPanel />);
    expect(screen.getAllByText("?").length).toBe(3);

    act(() => {
      useGameUIStore.getState().addUnlockedBadge("badge_explorador");
    });

    rerender(<BadgeGalleryPanel />);

    await waitFor(() => {
      expect(screen.getAllByText("?").length).toBe(2);
    });
  });

  it("addUnlockedBadge does not duplicate existing badge", () => {
    act(() => {
      useGameUIStore.setState({
        badgeGalleryOpen: true,
        badges: MOCK_BADGES,
        unlockedBadgeIds: ["badge_explorador"],
      });
    });

    act(() => {
      useGameUIStore.getState().addUnlockedBadge("badge_explorador");
    });

    expect(useGameUIStore.getState().unlockedBadgeIds).toEqual([
      "badge_explorador",
    ]);
  });
});
