import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import GameOverlay from "./GameOverlay";

jest.mock("@/lib/auth/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
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
  ToastNotification: () => null,
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
});
