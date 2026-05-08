import { describe, expect, it, mock } from "bun:test";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";

mock.module("../components/PhaserGame", () => ({
  default: () => <div data-testid="phaser-game">Mocked Game</div>,
}));

mock.module("next/navigation", () => ({
  useRouter: () => ({ push: mock(() => {}), replace: mock(() => {}) }),
  useSearchParams: () => new URLSearchParams(),
}));

mock.module("@/lib/auth/useAuth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: true,
    isLoading: false,
    accessToken: null,
    login: mock(async () => {}),
    confirmLogin: mock(async () => {}),
    register: mock(async () => {}),
    confirmVerifyEmail: mock(async () => {}),
    logout: mock(async () => {}),
    logoutAll: mock(async () => {}),
  }),
}));

describe("HomePage", () => {
  it("renders the game container", () => {
    render(<HomePage />);
    expect(screen.getByTestId("phaser-game")).toBeDefined();
  });
});
