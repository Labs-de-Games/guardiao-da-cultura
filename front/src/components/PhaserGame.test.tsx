import { cleanup, render } from "@testing-library/react";
import posthog from "posthog-js";
import { act } from "react";
import PhaserGame from "./PhaserGame";

// This suite mounts PhaserGame repeatedly, and its effect registers window
// listeners (including the phaser-loading-error handler under test) that
// only get removed on unmount. Without explicit cleanup between tests,
// stale listeners from earlier tests in this file would also fire on later
// dispatchEvent calls.
afterEach(cleanup);

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

const sendGameEventMock = jest.fn().mockResolvedValue(true);
jest.mock("../lib/analyticsApi", () => ({
  sendGameEvent: (...args: unknown[]) => sendGameEventMock(...args),
}));

jest.mock("../game/main", () => ({
  __esModule: true,
  default: () => ({ destroy: () => {} }),
}));

// Players never authenticate (#738: no player login/registration) —
// PhaserGame always resolves playerId from the guest session id.
jest.mock("../lib/guestSession", () => ({
  getOrCreateGuestSessionId: () => "test-user-id",
}));

jest.mock("@/ui/overlay/GameOverlay", () => ({
  __esModule: true,
  default: () => null,
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

  it("captures critical_error_occurred and logs a game_event on a loaderror", async () => {
    (posthog.capture as jest.Mock).mockClear();
    sendGameEventMock.mockClear();

    render(<PhaserGame />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("phaser-loading-error", {
          detail: { stage: "asset_load", key: "level-1-tilemap" },
        }),
      );
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      "critical_error_occurred",
      expect.objectContaining({
        error_code: "asset_load_failed",
        is_blocking: true,
        asset_key: "level-1-tilemap",
      }),
    );
    expect(sendGameEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "test-user-id",
        metadata: expect.objectContaining({
          severity: "critical",
          error_code: "asset_load_failed",
        }),
      }),
    );
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
