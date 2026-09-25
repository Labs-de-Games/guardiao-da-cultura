import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
import { EventBus } from "@/shared/events/event-bus";
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

jest.mock("@/ui/interest/InterestDialog", () => ({
  InterestDialog: () => null,
}));

jest.mock("@/ui/panels/BadgeGalleryPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/ui/panels/ChunkSelectorPanel", () => ({
  ChunkSelectorPanel: () => null,
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

jest.mock("@/ui/state/dialogue-store", () => ({
  useDialogueStore: Object.assign(
    (
      selector: (state: {
        dialogueOpen: boolean;
        dialogueQueue: [];
        dequeueDialogue: () => void;
      }) => unknown,
    ) =>
      selector({
        dialogueOpen: false,
        dialogueQueue: [],
        dequeueDialogue: () => {},
      }),
    {
      getState: () => ({
        dialogueOpen: false,
        dialogueQueue: [],
        dequeueDialogue: () => {},
      }),
    },
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
      isInterestDialogOpen: false,
      introData: null,
      creditsOpen: false,
      levelTransitionActive: false,
    });
  });

  it("opens the sidebar when the game is already started on mount", async () => {
    useGameUIStore.setState({ gameStarted: true, sidebarOpen: false });

    render(<GameOverlay entryFlow="map" />);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(useGameUIStore.getState().sidebarOpen).toBe(true);
  });

  it("closes the sidebar when the level-start controls panel is dismissed", () => {
    render(<GameOverlay entryFlow="map" />);

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
    render(<GameOverlay entryFlow="map" />);

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
    render(<GameOverlay entryFlow="map" />);

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

    render(<GameOverlay entryFlow="map" />);

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

    render(<GameOverlay entryFlow="map" />);

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

    render(<GameOverlay entryFlow="map" />);

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

    render(<GameOverlay entryFlow="map" />);

    act(() => {
      fireEvent.keyDown(window, { key: "e" });
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:label-hide", undefined);
    emitSpy.mockRestore();
  });

  it("keeps showing labels after a scene-scoped subscriber unsubscribes", () => {
    useGameUIStore.setState({ gameStarted: true, labelData: null });

    render(<GameOverlay entryFlow="map" />);

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

    render(<GameOverlay entryFlow="map" />);

    act(() => {
      fireEvent.keyDown(window, { key: "e" });
    });

    // labelData should remain null (no crash, no state change)
    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("does not close the label when SPACE is pressed and no label is open", () => {
    useGameUIStore.setState({ gameStarted: true, labelData: null });

    render(<GameOverlay entryFlow="map" />);

    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });

    expect(useGameUIStore.getState().labelData).toBeNull();
  });

  it("does not render ToastNotification when gameStarted is false", () => {
    useGameUIStore.setState({ gameStarted: false });

    render(<GameOverlay entryFlow="map" />);

    expect(screen.queryByTestId("toast-notification")).toBeNull();
  });

  it("renders the credits button on the map screen", () => {
    useGameUIStore.setState({ gameStarted: false });

    render(<GameOverlay entryFlow="map" />);

    expect(screen.queryByRole("button", { name: "Créditos" })).not.toBeNull();
  });

  it("hides the credits button while a level hand-off is in flight", () => {
    useGameUIStore.setState({
      gameStarted: false,
      levelTransitionActive: true,
    });

    render(<GameOverlay entryFlow="map" />);

    expect(screen.queryByRole("button", { name: "Créditos" })).toBeNull();
  });

  it("renders ToastNotification when gameStarted is true", () => {
    useGameUIStore.setState({ gameStarted: true });

    render(<GameOverlay entryFlow="map" />);

    expect(screen.queryByTestId("toast-notification")).toBeDefined();
  });
});
