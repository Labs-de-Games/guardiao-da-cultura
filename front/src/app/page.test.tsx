import { render, screen } from "@testing-library/react";
import HomePage from "./page";

jest.mock("../components/PhaserGame", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: () =>
      React.createElement(
        "div",
        { "data-testid": "phaser-game" },
        "Mocked Game",
      ),
  };
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(() => {}), replace: jest.fn(() => {}) }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/lib/auth/useAuth", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: true,
    isLoading: false,
    accessToken: null,
    login: jest.fn(async () => {}),
    confirmLogin: jest.fn(async () => {}),
    register: jest.fn(async () => {}),
    confirmVerifyEmail: jest.fn(async () => {}),
    logout: jest.fn(async () => {}),
    logoutAll: jest.fn(async () => {}),
  }),
}));

jest.mock("@/lib/posthog/FeatureFlagContext", () => ({
  useFeatureFlag: () => true,
  usePostHogDistinctId: () => "test-distinct-id",
  FeatureFlagProvider: ({ children }) => children,
}));

describe("HomePage", () => {
  it("renders the game container", () => {
    render(<HomePage />);
    expect(screen.getByTestId("phaser-game")).toBeDefined();
  });
});
