import { describe, expect, it, mock } from "bun:test";
import { render } from "@testing-library/react";
import PhaserGame from "./PhaserGame";

mock.module("../game/main", () => ({
  default: () => ({ destroy: () => {} }),
}));

describe("PhaserGame", () => {
  it("renders without crashing", () => {
    const { container } = render(<PhaserGame />);
    expect(container).toBeDefined();
  });

  it("renders a game container div", () => {
    const { container } = render(<PhaserGame />);
    const gameContainer = container.querySelector("#game-container");
    expect(gameContainer).toBeDefined();
  });

  it("applies correct styles to container", () => {
    const { container } = render(<PhaserGame />);
    const gameContainer = container.querySelector(
      "#game-container",
    ) as HTMLElement;

    expect(gameContainer).toBeDefined();
    if (gameContainer) {
      expect(gameContainer.style.width).toBe("100%");
      expect(gameContainer.style.height).toBe("100vh");
      expect(gameContainer.style.overflow).toBe("hidden");
    }
  });
});
