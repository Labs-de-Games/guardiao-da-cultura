import { fireEvent, render, screen } from "@testing-library/react";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { ControlsPanel } from "./ControlsPanel";

describe("ControlsPanel", () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useGameUIStore.setState({
      controlsOpen: false,
      sidebarOpen: false,
      gameStarted: false,
    });
  });

  it("renders keybindings when open", () => {
    useGameUIStore.setState({ controlsOpen: true });
    render(<ControlsPanel />);

    // Assert that the controls title is visible
    expect(screen.getByText("Controles")).toBeInTheDocument();

    // Assert that key names are rendered
    expect(screen.getByText("Q")).toBeInTheDocument();
    expect(screen.getByText("WASD / Setas")).toBeInTheDocument();
    expect(screen.getByText("Espaço")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("TAB")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByText("ESC")).toBeInTheDocument();

    // Assert that action descriptions are rendered
    expect(screen.getByText("Rever controles")).toBeInTheDocument();
    expect(screen.getByText("Andar, subir e descer")).toBeInTheDocument();
    expect(screen.getByText("Pular")).toBeInTheDocument();
    expect(screen.getByText("Interagir")).toBeInTheDocument();
    expect(screen.getByText("Painel de status")).toBeInTheDocument();
    expect(screen.getByText("Galeria de conquistas")).toBeInTheDocument();
    expect(screen.getByText("Fechar controles")).toBeInTheDocument();
  });

  it("has correct accessibility (ARIA) attributes on the panel dialog", () => {
    useGameUIStore.setState({ controlsOpen: true });
    render(<ControlsPanel />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Controles");
  });

  it("is hidden when controlsOpen is false", () => {
    useGameUIStore.setState({ controlsOpen: false });
    render(<ControlsPanel />);

    // Since the panel is always in DOM now, we assert it has opacity: 0 and pointerEvents: none
    const title = screen.queryByText("Controles");
    expect(title).toBeInTheDocument();

    // Outer container check
    const container = title?.closest("div")?.parentElement;
    expect(container).toHaveStyle("opacity: 0");
    expect(container).toHaveStyle("pointer-events: none");
  });

  it("closes when ESC is pressed", () => {
    useGameUIStore.setState({ controlsOpen: true });
    render(<ControlsPanel />);

    expect(useGameUIStore.getState().controlsOpen).toBe(true);

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    expect(useGameUIStore.getState().controlsOpen).toBe(false);
  });

  it("blocks game keys (WASD, arrows, space, tab) from propagating when open", () => {
    useGameUIStore.setState({ controlsOpen: true });
    render(<ControlsPanel />);

    const testKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D",
      " ",
      "Tab",
    ];

    for (const key of testKeys) {
      const keyEvent = new KeyboardEvent("keydown", { key, cancelable: true });
      window.dispatchEvent(keyEvent);
      expect(keyEvent.defaultPrevented).toBe(true);
    }
  });

  it("does not block keys when panel is closed", () => {
    useGameUIStore.setState({ controlsOpen: false });
    render(<ControlsPanel />);

    const keyEvent = new KeyboardEvent("keydown", {
      key: "w",
      cancelable: true,
    });
    window.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(false);
  });
});
