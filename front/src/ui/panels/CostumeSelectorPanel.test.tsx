import { act, fireEvent, render, screen } from "@testing-library/react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { CostumeSelectorPanel } from "./CostumeSelectorPanel";

function resetStore() {
  useGameUIStore.setState({
    costumeSelectorOpen: false,
    costumeSelectorData: null,
  });
}

function openSelector(overrides?: {
  correctCostume?: string;
  equippedParts?: {
    head: string | null;
    torso: string | null;
    feet: string | null;
  };
  lockedParts?: { head: boolean; torso: boolean; feet: boolean };
}) {
  act(() => {
    useGameUIStore.setState({
      costumeSelectorOpen: true,
      costumeSelectorData: {
        instanceId: "costume-1",
        correctCostume: overrides?.correctCostume ?? "malandro",
        equippedParts: overrides?.equippedParts ?? {
          head: null,
          torso: null,
          feet: null,
        },
        lockedParts: overrides?.lockedParts ?? {
          head: false,
          torso: false,
          feet: false,
        },
      },
    });
  });
}

beforeEach(() => {
  resetStore();
  jest.clearAllMocks();
});

describe("CostumeSelectorPanel", () => {
  it("is hidden when costumeSelectorOpen is false", () => {
    render(<CostumeSelectorPanel />);

    // The title is static, so it renders in the DOM even while closed
    const container = screen
      .getByText("Vista o Manequim Corretamente")
      .closest("div")?.parentElement;
    expect(container).toHaveStyle("display: none");
  });

  it("renders the static panel title for a known costume", () => {
    openSelector({ correctCostume: "indian" });
    render(<CostumeSelectorPanel />);

    expect(
      screen.getByText("Vista o Manequim Corretamente"),
    ).toBeInTheDocument();
  });

  it("keeps the static title for an unknown costume", () => {
    openSelector({ correctCostume: "unknown_costume" });
    render(<CostumeSelectorPanel />);

    expect(
      screen.getByText("Vista o Manequim Corretamente"),
    ).toBeInTheDocument();
  });

  it("renders carousel images for every part", () => {
    openSelector();
    render(<CostumeSelectorPanel />);

    const images = document.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
  });

  it("shows the locked check icon for parts already locked in the store", () => {
    openSelector({
      equippedParts: {
        head: "malandro_head",
        torso: null,
        feet: null,
      },
      lockedParts: { head: true, torso: false, feet: false },
    });
    render(<CostumeSelectorPanel />);

    expect(
      document.querySelector('[data-testid="CheckCircleIcon"]'),
    ).toBeInTheDocument();
  });

  it("closes when the close button is clicked", () => {
    openSelector();
    render(<CostumeSelectorPanel />);

    act(() => {
      fireEvent.click(screen.getByLabelText("Fechar"));
    });

    expect(useGameUIStore.getState().costumeSelectorOpen).toBe(false);
  });

  it("emits ui:costume-selector-close when closed", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openSelector();
    render(<CostumeSelectorPanel />);

    act(() => {
      fireEvent.click(screen.getByLabelText("Fechar"));
    });

    expect(emitSpy).toHaveBeenCalledWith(
      "ui:costume-selector-close",
      undefined,
    );
    emitSpy.mockRestore();
  });

  it("closes when ESC is pressed", () => {
    openSelector();
    render(<CostumeSelectorPanel />);

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useGameUIStore.getState().costumeSelectorOpen).toBe(false);
  });

  it("emits game:pause-requested on open and game:resume-requested on close", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openSelector();
    const { unmount } = render(<CostumeSelectorPanel />);

    expect(emitSpy).toHaveBeenCalledWith("game:pause-requested", {
      reason: "costume-selector",
    });

    unmount();

    expect(emitSpy).toHaveBeenCalledWith("game:resume-requested", {
      reason: "costume-selector",
    });
    emitSpy.mockRestore();
  });

  it("rejects wrong parts on confirm, keeping the panel open", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openSelector();
    render(<CostumeSelectorPanel />);

    act(() => {
      fireEvent.click(screen.getByText("Confirmar"));
    });

    expect(
      emitSpy.mock.calls.filter(
        ([event]) => event === "ui:costume-part-rejected",
      ),
    ).toHaveLength(3);
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:costume-confirm",
      expect.anything(),
    );
    expect(useGameUIStore.getState().costumeSelectorOpen).toBe(true);
    emitSpy.mockRestore();
  });

  it("locks correct parts and confirms once all parts match the costume", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openSelector({
      correctCostume: "malandro",
      equippedParts: {
        head: "malandro_head",
        torso: "malandro_torso",
        feet: "malandro_feet",
      },
    });
    render(<CostumeSelectorPanel />);

    act(() => {
      fireEvent.click(screen.getByText("Confirmar"));
    });

    expect(
      emitSpy.mock.calls.filter(
        ([event]) => event === "ui:costume-part-selected",
      ),
    ).toHaveLength(3);
    expect(emitSpy).toHaveBeenCalledWith("ui:costume-confirm", {
      instanceId: "costume-1",
      equippedParts: {
        head: "malandro_head",
        torso: "malandro_torso",
        feet: "malandro_feet",
      },
    });
    expect(emitSpy).toHaveBeenCalledWith(
      "ui:costume-selector-close",
      undefined,
    );
    expect(useGameUIStore.getState().costumeSelectorOpen).toBe(false);
    emitSpy.mockRestore();
  });

  it("only re-evaluates parts that are not already locked", () => {
    const emitSpy = jest.spyOn(EventBus, "emit");
    openSelector({
      correctCostume: "malandro",
      equippedParts: {
        head: "malandro_head",
        torso: null,
        feet: null,
      },
      lockedParts: { head: true, torso: false, feet: false },
    });
    render(<CostumeSelectorPanel />);

    act(() => {
      fireEvent.click(screen.getByText("Confirmar"));
    });

    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:costume-part-selected",
      expect.objectContaining({ partType: "head" }),
    );
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:costume-part-rejected",
      expect.objectContaining({ partType: "head" }),
    );
    expect(
      emitSpy.mock.calls.filter(
        ([event]) => event === "ui:costume-part-rejected",
      ),
    ).toHaveLength(2);
    emitSpy.mockRestore();
  });

  it("disables prev/next buttons for locked parts", () => {
    openSelector({
      lockedParts: { head: true, torso: false, feet: false },
    });
    render(<CostumeSelectorPanel />);

    const buttons = screen.getAllByRole("button");
    // buttons[0] is the close ("Fechar") button; [1]/[2] are the head
    // carousel's prev/next chevrons
    expect(buttons[1]).toBeDisabled();
    expect(buttons[2]).toBeDisabled();
  });
});
