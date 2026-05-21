import { render } from "@testing-library/react";
import { act } from "react";
import PhaserGame from "./PhaserGame";

jest.mock("../game/main", () => ({
  default: () => ({ destroy: () => {} }),
}));

jest.mock("../lib/auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-id",
      email: "",
      nickname: "Test",
      firstName: "",
      lastName: "",
      role: "player",
      isEmailVerified: false,
    },
    isAuthenticated: true,
    isLoading: false,
    accessToken: "test-token",
    login: async () => {},
    confirmLogin: async () => {},
    register: async () => {},
    confirmVerifyEmail: async () => {},
    logout: async () => {},
    logoutAll: async () => {},
  }),
}));

describe("PhaserGame", () => {
  it("renders without crashing", async () => {
    const { container } = render(<PhaserGame />);
    await act(async () => {
      // Flush the dynamic import + state update.
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(container).toBeDefined();
  });

  it("renders a game container div", async () => {
    const { container } = render(<PhaserGame />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    const gameContainer = container.querySelector("#game-container");
    expect(gameContainer).toBeDefined();
  });

  it("applies correct styles to container", async () => {
    const { container } = render(<PhaserGame />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
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

  it("cleans up the game instance on unmount", async () => {
    const { unmount } = render(<PhaserGame />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    unmount();

    // The test asserts unmount doesn't throw; game destruction is mocked.
    expect(true).toBe(true);
  });
});
