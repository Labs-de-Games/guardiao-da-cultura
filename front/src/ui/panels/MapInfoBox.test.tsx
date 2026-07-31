import { act, render, screen } from "@testing-library/react";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { MapInfoBox } from "./MapInfoBox";

const GOLD_STAR = "/assets/ui/stars/gold_star.png";
const GRAY_STAR = "/assets/ui/stars/star_gray.png";

function getStarImages(el: HTMLElement): HTMLImageElement[] {
  return Array.from(el.querySelectorAll("img"));
}

describe("MapInfoBox", () => {
  beforeEach(() => {
    useGameUIStore.setState({
      gameStarted: false,
      activeMapMarker: {
        markerId: "brumadinho",
        title: "Instituto Inhotim",
        location: "Brumadinho - MG",
        isAvailable: true,
        screenX: 640,
        screenY: 480,
        levelId: "level_01",
      },
      progression: null,
    });
  });

  it("renders nothing when gameStarted is true", () => {
    useGameUIStore.setState({ gameStarted: true });

    const { container } = render(<MapInfoBox />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when activeMapMarker is null", () => {
    useGameUIStore.setState({ activeMapMarker: null });

    const { container } = render(<MapInfoBox />);
    expect(container.innerHTML).toBe("");
  });

  it("renders 5 gray stars when progression is null", () => {
    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.src).toContain(GRAY_STAR);
    });
  });

  it("renders 5 gray stars when completedLevels is empty", () => {
    useGameUIStore.setState({
      progression: {
        currentLevel: 1,
        totalStars: 0,
        completedLevels: {},
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.src).toContain(GRAY_STAR);
    });
  });

  it("renders correct gold/gray stars for earned count", () => {
    useGameUIStore.setState({
      progression: {
        currentLevel: 2,
        totalStars: 3,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 12, stars: 3 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars).toHaveLength(5);
    expect(stars[0].src).toContain(GOLD_STAR);
    expect(stars[1].src).toContain(GOLD_STAR);
    expect(stars[2].src).toContain(GOLD_STAR);
    expect(stars[3].src).toContain(GRAY_STAR);
    expect(stars[4].src).toContain(GRAY_STAR);
  });

  it("renders 5 gold stars when all earned", () => {
    useGameUIStore.setState({
      progression: {
        currentLevel: 6,
        totalStars: 5,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 20, stars: 5 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.src).toContain(GOLD_STAR);
    });
  });

  it("floors fractional stars", () => {
    useGameUIStore.setState({
      progression: {
        currentLevel: 2,
        totalStars: 2.5,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 10, stars: 2.5 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars[0].src).toContain(GOLD_STAR);
    expect(stars[1].src).toContain(GOLD_STAR);
    expect(stars[2].src).toContain(GRAY_STAR);
    expect(stars[3].src).toContain(GRAY_STAR);
    expect(stars[4].src).toContain(GRAY_STAR);
  });

  it("clamps stars greater than 5", () => {
    useGameUIStore.setState({
      progression: {
        currentLevel: 2,
        totalStars: 7,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 28, stars: 7 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.src).toContain(GOLD_STAR);
    });
  });

  it("has accessible star container with aria-label", () => {
    useGameUIStore.setState({
      progression: {
        currentLevel: 2,
        totalStars: 3,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 12, stars: 3 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    render(<MapInfoBox />);

    expect(
      screen.getByRole("img", { name: "3 de 5 estrelas" }),
    ).toBeInTheDocument();
  });

  it("marks individual star images as aria-hidden", () => {
    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    stars.forEach((star) => {
      expect(star).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("updates stars when progression changes", () => {
    const { container, rerender } = render(<MapInfoBox />);

    let stars = getStarImages(container);
    expect(stars[0].src).toContain(GRAY_STAR);

    act(() => {
      useGameUIStore.setState({
        progression: {
          currentLevel: 2,
          totalStars: 4,
          completedLevels: {
            level_01: { completedAt: "2026-01-01", score: 16, stars: 4 },
          },
          clues: {},
          quizResults: {},
          intermediateQuizResults: {},
        },
      });
    });

    rerender(<MapInfoBox />);

    stars = getStarImages(container);
    expect(stars[0].src).toContain(GOLD_STAR);
    expect(stars[1].src).toContain(GOLD_STAR);
    expect(stars[2].src).toContain(GOLD_STAR);
    expect(stars[3].src).toContain(GOLD_STAR);
    expect(stars[4].src).toContain(GRAY_STAR);
  });

  it("uses correct levelId from active marker", () => {
    useGameUIStore.setState({
      activeMapMarker: {
        markerId: "blumenau",
        title: "Oktoberfest",
        location: "Blumenau - SC",
        isAvailable: true,
        screenX: 500,
        screenY: 400,
        levelId: "level_02",
      },
      progression: {
        currentLevel: 3,
        totalStars: 5,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 20, stars: 5 },
          level_02: { completedAt: "2026-01-02", score: 8, stars: 2 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars[0].src).toContain(GOLD_STAR);
    expect(stars[1].src).toContain(GOLD_STAR);
    expect(stars[2].src).toContain(GRAY_STAR);
    expect(stars[3].src).toContain(GRAY_STAR);
    expect(stars[4].src).toContain(GRAY_STAR);
  });

  it("shows 5 gray stars for locked stages without levelId", () => {
    useGameUIStore.setState({
      activeMapMarker: {
        markerId: "future",
        title: "Em Breve",
        location: "Brazil",
        isAvailable: false,
        screenX: 300,
        screenY: 200,
      },
    });

    const { container } = render(<MapInfoBox />);

    const stars = getStarImages(container);
    expect(stars).toHaveLength(5);
    stars.forEach((star) => {
      expect(star.src).toContain(GRAY_STAR);
    });
  });

  it("shows 'Em breve' when prereq is completed but stage is unavailable", () => {
    useGameUIStore.setState({
      activeMapMarker: {
        markerId: "curitiba",
        title: "Teatro Guaíra",
        location: "Curitiba - PR",
        isAvailable: false,
        screenX: 500,
        screenY: 400,
        levelId: "level_02",
      },
      progression: {
        currentLevel: 2,
        totalStars: 5,
        completedLevels: {
          level_01: { completedAt: "2026-01-01", score: 20, stars: 5 },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      },
    });

    render(<MapInfoBox />);
    expect(screen.getByText("Em breve")).toBeInTheDocument();
  });
});
