import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
import { EventBus } from "@/shared/events/event-bus";
import { STAGE_EXIT_CALLBACK_ID } from "@/ui/hooks/useStageExit";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import GameOverlay from "./GameOverlay";

// The real EventBus drives this suite, so it needs a working EventEmitter.
// The global test-setup mock stubs every emitter method with jest.fn(), which
// would silently swallow every emit. Phaser's emitter is eventemitter3.
jest.mock("phaser", () => ({
  Events: { EventEmitter: jest.requireActual("eventemitter3") },
}));

jest.mock("@/ui/hooks/useEventBridge", () => ({
  useEventBridge: jest.fn(),
}));

jest.mock("@/ui/hooks/useDialogueBridge", () => ({
  useDialogueBridge: () => ({
    emitComplete: jest.fn(),
    emitDismiss: jest.fn(),
  }),
}));

jest.mock("@/ui/hud/Sidebar", () => ({
  Sidebar: () => null,
}));

jest.mock("@/ui/intro/IntroSequence", () => ({
  IntroSequence: () => null,
}));

jest.mock("@/ui/panels/BadgeGalleryPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/ui/panels/ChunkSelectorPanel", () => ({
  ChunkSelectorPanel: () => null,
}));

jest.mock("@/ui/panels/ConfirmationPanel", () => ({
  ConfirmationPanel: ({
    onComplete,
    onDismiss,
  }: {
    onComplete: (callbackId: string, confirmed?: boolean) => void;
    onDismiss: (callbackId: string) => void;
  }) => (
    <div data-testid="confirmation-panel">
      <button
        type="button"
        onClick={() => onComplete(mockDialogueState.dialogueCallbackId, true)}
      >
        confirm-yes
      </button>
      <button
        type="button"
        onClick={() => onComplete(mockDialogueState.dialogueCallbackId, false)}
      >
        confirm-no
      </button>
      <button
        type="button"
        onClick={() => onDismiss(mockDialogueState.dialogueCallbackId)}
      >
        confirm-dismiss
      </button>
    </div>
  ),
}));

jest.mock("@/ui/panels/ControlsPanel", () => ({
  ControlsPanel: () => null,
}));

jest.mock("@/ui/panels/DialoguePanel", () => ({
  DialoguePanel: () => null,
}));

jest.mock("@/ui/panels/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/ui/panels/LabelPanel", () => ({
  LabelPanel: () => null,
}));

jest.mock("@/ui/panels/MapInfoBox", () => ({
  MapInfoBox: () => null,
}));

jest.mock("@/ui/panels/MapPinTooltip", () => ({
  MapPinTooltip: () => null,
}));

jest.mock("@/ui/panels/ToastNotification", () => ({
  ToastNotification: () => <div data-testid="toast-notification" />,
}));

jest.mock("@/ui/quiz/Quiz", () => ({
  __esModule: true,
  default: () => null,
}));

// Prefixed "mock" so babel-plugin-jest-hoist allows referencing it from the
// hoisted jest.mock factory below. Mutated per-test instead of reconstructed,
// so tests can flip a single field (e.g. dialogueOpen) and re-render.
const mockDialogueState = {
  dialogueOpen: false,
  dialogueMode: "dialogue" as "dialogue" | "confirmation",
  dialogueCallbackId: "",
  dialogueQueue: [] as unknown[],
  dequeueDialogue: jest.fn(),
  showConfirmation: jest.fn(),
};

jest.mock("@/ui/state/dialogue-store", () => ({
  useDialogueStore: Object.assign(
    (selector: (state: typeof mockDialogueState) => unknown) =>
      selector(mockDialogueState),
    { getState: () => mockDialogueState },
  ),
}));

describe("GameOverlay", () => {
  beforeEach(() => {
    useGameUIStore.setState({
      gameStarted: false,
      sidebarOpen: false,
      controlsOpen: false,
      badgeGalleryOpen: false,
      chunkSelectorOpen: false,
      labelData: null,
      introData: null,
      creditsOpen: false,
      levelTransitionActive: false,
    });
    useGameUIStore.getState().resetQuiz();
    mockDialogueState.dialogueOpen = false;
    mockDialogueState.dialogueMode = "dialogue";
    mockDialogueState.dialogueCallbackId = "";
    mockDialogueState.dialogueQueue = [];
    mockDialogueState.showConfirmation.mockClear();
  });

  it("opens the sidebar when the game is already started on mount", async () => {
    useGameUIStore.setState({ gameStarted: true, sidebarOpen: false });

    render(<GameOverlay />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(useGameUIStore.getState().sidebarOpen).toBe(true);
  });

  it("closes the sidebar when the level-start controls panel is dismissed", () => {
    render(<GameOverlay />);

    act(() => {
      useGameUIStore.setState({ gameStarted: true, controlsOpen: true });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);

    act(() => {
      useGameUIStore.setState({ controlsOpen: false });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);
  });

  it("does not close the sidebar on later controls panel dismissals", () => {
    render(<GameOverlay />);

    act(() => {
      useGameUIStore.setState({ gameStarted: true, controlsOpen: true });
    });
    act(() => {
      useGameUIStore.setState({ controlsOpen: false });
    });

    fireEvent.keyDown(window, { key: "Tab" });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);

    act(() => {
      useGameUIStore.setState({ controlsOpen: true });
    });
    act(() => {
      useGameUIStore.setState({ controlsOpen: false });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);
  });

  it("re-arms the level-start auto-close for the next level", () => {
    render(<GameOverlay />);

    act(() => {
      useGameUIStore.setState({ gameStarted: true, controlsOpen: true });
    });
    act(() => {
      useGameUIStore.setState({ controlsOpen: false });
    });
    act(() => {
      useGameUIStore.getState().endGame();
    });

    act(() => {
      useGameUIStore.setState({ gameStarted: true, controlsOpen: true });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);

    act(() => {
      useGameUIStore.setState({ controlsOpen: false });
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);
  });

  it("closes the label when Escape is pressed while a label is open", () => {
    useGameUIStore.setState({
      gameStarted: true,
      labelData: { title: "Obra", author: "Art", description: "Desc" },
    });

    render(<GameOverlay />);

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("closes the label when E is pressed while a label is open", () => {
    useGameUIStore.setState({
      gameStarted: true,
      labelData: { title: "Obra", author: "Art", description: "Desc" },
    });

    render(<GameOverlay />);

    act(() => {
      fireEvent.keyDown(window, { key: "e" });
    });

    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("closes the label when SPACE is pressed while a label is open", () => {
    useGameUIStore.setState({
      gameStarted: true,
      labelData: { title: "Obra", author: "Art", description: "Desc" },
    });

    render(<GameOverlay />);

    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });

    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("emits ui:label-hide when closing the label via keyboard", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    useGameUIStore.setState({
      gameStarted: true,
      labelData: { title: "Obra", author: "Art", description: "Desc" },
    });

    render(<GameOverlay />);

    act(() => {
      fireEvent.keyDown(window, { key: "e" });
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:label-hide", undefined);
    emitSpy.mockRestore();
  });

  it("keeps showing labels after a scene-scoped subscriber unsubscribes", () => {
    useGameUIStore.setState({ gameStarted: true, labelData: null });

    render(<GameOverlay />);

    // The Game scene subscribes to ui:label-show too and drops its listener on
    // SHUTDOWN. Tearing that listener down must not detach the overlay's, or the
    // label panel never renders while movement stays locked (issue #752).
    const sceneHandler = jest.fn();
    const unsubscribeScene = EventBus.on("ui:label-show", sceneHandler);
    unsubscribeScene();

    act(() => {
      EventBus.emit("ui:label-show", {
        title: "Obra",
        author: "Art",
        description: "Desc",
      });
    });

    expect(sceneHandler).not.toHaveBeenCalled();
    expect(useGameUIStore.getState().labelData).toEqual({
      title: "Obra",
      author: "Art",
      description: "Desc",
    });
  });

  it("does not close the label when E is pressed and no label is open", () => {
    useGameUIStore.setState({ gameStarted: true, labelData: null });

    render(<GameOverlay />);

    act(() => {
      fireEvent.keyDown(window, { key: "e" });
    });

    // labelData should remain null (no crash, no state change)
    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("does not close the label when SPACE is pressed and no label is open", () => {
    useGameUIStore.setState({ gameStarted: true, labelData: null });

    render(<GameOverlay />);

    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });

    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("does not render ToastNotification when gameStarted is false", () => {
    useGameUIStore.setState({ gameStarted: false });

    render(<GameOverlay />);

    expect(screen.queryByTestId("toast-notification")).toBeNull();
  });

  it("renders the credits button on the map screen", () => {
    useGameUIStore.setState({ gameStarted: false });

    render(<GameOverlay />);

    expect(screen.queryByRole("button", { name: "Créditos" })).not.toBeNull();
  });

  it("hides the credits button while a level hand-off is in flight", () => {
    useGameUIStore.setState({
      gameStarted: false,
      levelTransitionActive: true,
    });

    render(<GameOverlay />);

    expect(screen.queryByRole("button", { name: "Créditos" })).toBeNull();
  });

  it("renders ToastNotification when gameStarted is true", () => {
    useGameUIStore.setState({ gameStarted: true });

    render(<GameOverlay />);

    expect(screen.queryByTestId("toast-notification")).toBeDefined();
  });

  describe("stage-exit confirmation on Escape", () => {
    // Mounting with gameStarted:true auto-opens the sidebar (see the
    // mount-effect test above), which would otherwise intercept Escape
    // before it ever reaches the stage-exit branch. Closing it post-mount
    // simulates the realistic precondition: the player already dismissed it.
    function renderWithNothingOpen() {
      const result = render(<GameOverlay />);
      act(() => {
        useGameUIStore.setState({ sidebarOpen: false });
      });
      return result;
    }

    it("shows the confirmation when Escape is pressed with nothing else open", () => {
      useGameUIStore.setState({ gameStarted: true });

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).toHaveBeenCalledWith(
        expect.any(String),
        "",
        STAGE_EXIT_CALLBACK_ID,
      );
    });

    it("does not show the confirmation when Escape is pressed and the game has not started", () => {
      useGameUIStore.setState({ gameStarted: false });

      render(<GameOverlay />);

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });

    it("shows the confirmation (and leaves the sidebar open) when Escape is pressed while the sidebar is open", () => {
      // TAB is the only way to close the sidebar now — Escape must not
      // close it, it should open the stage-exit prompt instead.
      useGameUIStore.setState({ gameStarted: true, sidebarOpen: true });

      render(<GameOverlay />);

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(useGameUIStore.getState().sidebarOpen).toBe(true);
      expect(mockDialogueState.showConfirmation).toHaveBeenCalledWith(
        expect.any(String),
        "",
        STAGE_EXIT_CALLBACK_ID,
      );
    });

    it("does not show the confirmation while the badge gallery is open", () => {
      useGameUIStore.setState({ gameStarted: true, badgeGalleryOpen: true });

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });

    it("does not show the confirmation while a label is open", () => {
      useGameUIStore.setState({
        gameStarted: true,
        labelData: { title: "Obra", author: "Art", description: "Desc" },
      });

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });

    it("does not show the confirmation while the controls panel is open", () => {
      useGameUIStore.setState({ gameStarted: true, controlsOpen: true });

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });

    it("does not show the confirmation while the quiz is visible", () => {
      useGameUIStore.setState({ gameStarted: true });
      useGameUIStore.setState((s) => ({
        quiz: { ...s.quiz, isVisible: true },
      }));

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });

    it("does not show the confirmation while a dialogue/confirmation is already open", () => {
      useGameUIStore.setState({ gameStarted: true });
      mockDialogueState.dialogueOpen = true;

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });

    it("does not show the confirmation while the intro cinematic is playing", () => {
      // Under the "direct" entry flow, gameStarted is already true while
      // the cinematic plays — Escape must reach IntroSequence's own skip
      // handler untouched, not pop the stage-exit prompt on top of it.
      useGameUIStore.setState({ gameStarted: true });
      useGameUIStore.setState({
        introData: {
          levelId: "level_01",
          config: {
            revealIconMask: "",
            loadingImage: "",
            skipEnabled: true,
            panels: [],
          },
        },
      });

      renderWithNothingOpen();

      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });

      expect(mockDialogueState.showConfirmation).not.toHaveBeenCalled();
    });
  });

  describe("stage-exit confirmation response", () => {
    beforeEach(() => {
      useGameUIStore.setState({ gameStarted: true });
      mockDialogueState.dialogueOpen = true;
      mockDialogueState.dialogueMode = "confirmation";
      mockDialogueState.dialogueCallbackId = STAGE_EXIT_CALLBACK_ID;
    });

    it("emits stage:exit-confirmed when the player confirms", () => {
      const emitSpy = jest.spyOn(EventBus, "emit");

      render(<GameOverlay />);

      act(() => {
        fireEvent.click(screen.getByText("confirm-yes"));
      });

      expect(emitSpy).toHaveBeenCalledWith("stage:exit-confirmed", undefined);
      emitSpy.mockRestore();
    });

    it("does not emit stage:exit-confirmed when the player declines", () => {
      const emitSpy = jest.spyOn(EventBus, "emit");

      render(<GameOverlay />);

      act(() => {
        fireEvent.click(screen.getByText("confirm-no"));
      });

      expect(emitSpy).not.toHaveBeenCalledWith(
        "stage:exit-confirmed",
        undefined,
      );
      emitSpy.mockRestore();
    });

    it("does not emit stage:exit-confirmed when the player dismisses via Escape", () => {
      const emitSpy = jest.spyOn(EventBus, "emit");

      render(<GameOverlay />);

      act(() => {
        fireEvent.click(screen.getByText("confirm-dismiss"));
      });

      expect(emitSpy).not.toHaveBeenCalledWith(
        "stage:exit-confirmed",
        undefined,
      );
      emitSpy.mockRestore();
    });

    it("pauses GAME+UI while the confirmation is open", () => {
      const emitSpy = jest.spyOn(EventBus, "emit");

      render(<GameOverlay />);

      expect(emitSpy).toHaveBeenCalledWith("game:pause-requested", {
        reason: "stage-exit-confirm",
      });
      emitSpy.mockRestore();
    });

    it("resumes GAME+UI when the confirmation closes without confirming (cancel/dismiss)", () => {
      const emitSpy = jest.spyOn(EventBus, "emit");

      const { rerender } = render(<GameOverlay />);

      mockDialogueState.dialogueOpen = false;
      rerender(<GameOverlay />);

      expect(emitSpy).toHaveBeenCalledWith("game:resume-requested", {
        reason: "stage-exit-confirm",
      });
      emitSpy.mockRestore();
    });

    it("does not emit a generic game:resume-requested when the player confirms", () => {
      // Phaser scene ops are queued, not synchronous. UIScene's
      // "stage:exit-confirmed" handler already resumes UI explicitly
      // before stopping GAME; a late generic resume-request landing in the
      // queue behind that stop would revive the already-shut-down GAME
      // scene into RUNNING with a torn-down camera (crashes on the next
      // frame's update()). See the ref-suppression comment in GameOverlay.
      const emitSpy = jest.spyOn(EventBus, "emit");

      const { rerender } = render(<GameOverlay />);

      act(() => {
        fireEvent.click(screen.getByText("confirm-yes"));
      });

      mockDialogueState.dialogueOpen = false;
      rerender(<GameOverlay />);

      expect(emitSpy).not.toHaveBeenCalledWith("game:resume-requested", {
        reason: "stage-exit-confirm",
      });
      emitSpy.mockRestore();
    });
  });
});
