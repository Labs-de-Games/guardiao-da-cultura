import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

mock.module("../components/PhaserGame", () => ({
  default: () => <div data-testid="phaser-game">Mocked Game</div>,
}));

describe("HomePage", () => {
  it("renders the game container", () => {
    render(<HomePage />);
    expect(screen.getByTestId("phaser-game")).toBeDefined();
  });
});
