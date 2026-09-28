import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { STAGE_EXIT_CALLBACK_ID } from "@/ui/hooks/useStageExit";
import { useDialogueStore } from "@/ui/state/dialogue-store";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { Sidebar } from "./Sidebar";

// dialogue-store pulls in the real EventBus, which wraps Phaser's emitter —
// not available in jsdom. None of these tests need it to actually emit.
jest.mock("phaser", () => ({
  Events: {
    EventEmitter: class {
      on = jest.fn();
      off = jest.fn();
      once = jest.fn();
      emit = jest.fn();
      removeAllListeners = jest.fn();
    },
  },
}));

jest.mock("./AudioSubpanel", () => ({ AudioSubpanel: () => null }));
jest.mock("./ControlsSubpanel", () => ({ ControlsSubpanel: () => null }));
jest.mock("./HintCard", () => ({
  HintCard: () => <div data-testid="sidebar-content" />,
}));
jest.mock("./ObjectiveList", () => ({ ObjectiveList: () => null }));
jest.mock("./PhaseInfoCard", () => ({ PhaseInfoCard: () => null }));

describe("Sidebar", () => {
  beforeEach(() => {
    useGameUIStore.setState({ sidebarOpen: false });
    useDialogueStore.setState({
      dialogueOpen: false,
      dialogueMode: "dialogue",
      dialogueCallbackId: "",
      dialogueConfirmMessage: "",
      dialogueQueue: [],
    });
  });

  it("shows only the expand tab when closed", () => {
    render(<Sidebar />);

    expect(screen.queryByTestId("sidebar-content")).toBeNull();
    const toggle = screen.getByRole("button", { name: "Abrir painel" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the panel and the collapse tab when open", () => {
    useGameUIStore.setState({ sidebarOpen: true });
    render(<Sidebar />);

    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fechar painel" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("toggles the sidebar through the store when the tab is clicked", async () => {
    render(<Sidebar />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Abrir painel" }));
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(true);
    expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Fechar painel" }));
    });
    expect(useGameUIStore.getState().sidebarOpen).toBe(false);
    await waitFor(() =>
      expect(screen.queryByTestId("sidebar-content")).toBeNull(),
    );
  });

  it("does not render the exit button while the sidebar is collapsed", () => {
    render(<Sidebar />);

    expect(screen.queryByText("VOLTAR AO MAPA")).toBeNull();
  });

  describe("VOLTAR AO MAPA", () => {
    beforeEach(() => {
      useGameUIStore.setState({ sidebarOpen: true });
    });

    it("opens the stage-exit confirmation when clicked", () => {
      render(<Sidebar />);

      fireEvent.click(screen.getByText("VOLTAR AO MAPA"));

      const state = useDialogueStore.getState();
      expect(state.dialogueOpen).toBe(true);
      expect(state.dialogueMode).toBe("confirmation");
      expect(state.dialogueCallbackId).toBe(STAGE_EXIT_CALLBACK_ID);
    });

    it("does not queue a second confirmation when one is already open", () => {
      render(<Sidebar />);

      act(() => {
        useDialogueStore.setState({
          dialogueOpen: true,
          dialogueMode: "confirmation",
          dialogueCallbackId: "some-other-confirmation",
        });
      });

      fireEvent.click(screen.getByText("VOLTAR AO MAPA"));

      expect(useDialogueStore.getState().dialogueQueue).toHaveLength(0);
    });
  });
});
