import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { act } from "react";
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
});
