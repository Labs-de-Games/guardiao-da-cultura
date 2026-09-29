import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { act, StrictMode } from "react";
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

const destroyGame = jest.fn();
const mockStartGame = jest.fn(() => ({
  destroy: destroyGame,
  canvas: null,
  scale: { on: () => {}, off: () => {} },
  sound: {},
}));

const destroyAudioManager = jest.fn();
jest.mock("../game/audio", () => ({
  __esModule: true,
  AudioManager: { destroy: () => destroyAudioManager() },
}));

jest.mock("../game/main", () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockStartGame(...(args as [])),
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

  it("destroys the game and silences the audio singleton on unmount", async () => {
    destroyGame.mockClear();
    destroyAudioManager.mockClear();

    const { unmount } = render(<PhaserGame />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    unmount();

    expect(destroyGame).toHaveBeenCalledTimes(1);
    expect(destroyAudioManager).toHaveBeenCalledTimes(1);
  });

  // StrictMode is Next's dev default, and it mounts, tears down and remounts
  // every effect. The teardown lands while the game's dynamic import is
  // still in flight, which is precisely when an instance can escape its
  // owner: the symptom was menu music still playing over /privacidade and
  // /, and a second, invisible MapIntroScene answering the same window-level
  // arrow keys as the visible one once the player returned to /game.
  it("leaves no game running after a StrictMode mount cycle", async () => {
    mockStartGame.mockClear();
    destroyGame.mockClear();

    const { unmount } = render(
      <StrictMode>
        <PhaserGame />
      </StrictMode>,
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    unmount();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(destroyGame).toHaveBeenCalledTimes(mockStartGame.mock.calls.length);
  });
});

describe("PhaserGame init failure", () => {
  it("shows the load error screen and re-initializes on retry", async () => {
    mockStartGame.mockClear();
    mockStartGame.mockImplementationOnce(() => {
      throw new Error("init failed");
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    render(<PhaserGame />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(
      screen.getByRole("heading", { name: "Não foi possível carregar o jogo" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(mockStartGame).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole("heading", {
        name: "Não foi possível carregar o jogo",
      }),
    ).not.toBeInTheDocument();
  });
});
