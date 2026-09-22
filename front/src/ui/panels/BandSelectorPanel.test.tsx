import { act, fireEvent, render, screen } from "@testing-library/react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { BandSelectorPanel } from "./BandSelectorPanel";

function resetStore() {
  useGameUIStore.setState({
    bandPanelOpen: false,
    bandPanelData: null,
  });
}

function openPanel(overrides?: { id?: string; options?: string[] }) {
  act(() => {
    useGameUIStore.setState({
      bandPanelOpen: true,
      bandPanelData: {
        instanceId: "band-1",
        id: overrides?.id ?? "accordion",
        options: overrides?.options ?? ["accordion", "triangle", "guitar"],
      },
    });
  });
}

function selectOption(musicianId: string) {
  const button = screen.getByAltText(musicianId).closest("button");
  if (!button) throw new Error(`no button found for ${musicianId}`);
  act(() => {
    fireEvent.click(button);
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe("BandSelectorPanel", () => {
  it("renders nothing when bandPanelOpen is false", () => {
    render(<BandSelectorPanel />);

    expect(
      screen.queryByText("Monte a banda de forró"),
    ).not.toBeInTheDocument();
  });

  it("renders an option image for every musician in bandPanelData.options", () => {
    openPanel({ options: ["accordion", "triangle", "guitar"] });
    render(<BandSelectorPanel />);

    expect(screen.getByAltText("accordion")).toBeInTheDocument();
    expect(screen.getByAltText("triangle")).toBeInTheDocument();
    expect(screen.getByAltText("guitar")).toBeInTheDocument();
  });

  it("disables the confirm button until an option is selected", () => {
    openPanel();
    render(<BandSelectorPanel />);

    expect(screen.getByText("Confirmar").closest("button")).toBeDisabled();

    selectOption("accordion");

    expect(screen.getByText("Confirmar").closest("button")).not.toBeDisabled();
  });

  it("confirms and closes when the correct musician is selected", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openPanel({
      id: "accordion",
      options: ["accordion", "triangle", "guitar"],
    });
    render(<BandSelectorPanel />);

    selectOption("accordion");
    act(() => {
      fireEvent.click(screen.getByText("Confirmar"));
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:band-confirm", {
      instanceId: "band-1",
      musicianId: "accordion",
    });
    expect(emitSpy).toHaveBeenCalledWith("ui:band-panel-close", undefined);
    expect(useGameUIStore.getState().bandPanelOpen).toBe(false);
    emitSpy.mockRestore();
  });

  it("rejects the wrong musician and keeps the panel open", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openPanel({
      id: "accordion",
      options: ["accordion", "triangle", "guitar"],
    });
    render(<BandSelectorPanel />);

    selectOption("triangle");
    act(() => {
      fireEvent.click(screen.getByText("Confirmar"));
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:band-choice-rejected", {
      instanceId: "band-1",
      musicianId: "triangle",
    });
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:band-confirm",
      expect.anything(),
    );
    expect(useGameUIStore.getState().bandPanelOpen).toBe(true);
    emitSpy.mockRestore();
  });

  it("closes when the close button is clicked", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openPanel();
    render(<BandSelectorPanel />);

    act(() => {
      fireEvent.click(screen.getByLabelText("Fechar"));
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:band-panel-close", undefined);
    expect(useGameUIStore.getState().bandPanelOpen).toBe(false);
    emitSpy.mockRestore();
  });

  it("closes when ESC is pressed", () => {
    openPanel();
    render(<BandSelectorPanel />);

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useGameUIStore.getState().bandPanelOpen).toBe(false);
  });
});
