import { act, fireEvent, render, screen } from "@testing-library/react";
import { buildStepSequenceData } from "@/game/data/stepSequenceContent";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { StepSequencePanel } from "./StepSequencePanel";
import type { StepSequenceData } from "./step-sequence-types";

// Built through the real resolver so the fixture cannot drift from the paths
// and payload shape the game actually emits.
const FIXTURE = buildStepSequenceData("quadrilha-1", [
  "balance",
  "side_step",
]) as StepSequenceData;
const [FIRST_STEP, SECOND_STEP] = FIXTURE.expectedSequence;

function openPanel(overrides: Partial<StepSequenceData> = {}) {
  act(() => {
    useGameUIStore.setState({
      stepSequenceOpen: true,
      stepSequenceData: {
        ...FIXTURE,
        ...overrides,
      },
    });
  });
}

let emitSpy: jest.SpyInstance;

function rejectionCalls() {
  return emitSpy.mock.calls
    .filter(([event]) => event === "ui:step-sequence-rejected")
    .map(([, payload]) => payload);
}

beforeEach(() => {
  emitSpy = jest.spyOn(EventBus, "emit");
  act(() => {
    useGameUIStore.setState({
      stepSequenceOpen: false,
      stepSequenceData: null,
    });
  });
  jest.clearAllMocks();
});

describe("StepSequencePanel", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<StepSequencePanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title, instruction and one slot per expected step", () => {
    render(<StepSequencePanel />);
    openPanel();

    expect(screen.getByText("Passos de quadrilha")).toBeInTheDocument();
    expect(
      screen.getByText("Observe os movimentos no vídeo e repita a sequência."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("step-slot-0")).toBeInTheDocument();
    expect(screen.getByTestId("step-slot-1")).toBeInTheDocument();
    expect(screen.queryByTestId("step-slot-2")).not.toBeInTheDocument();
  });

  it("pauses the game while open and resumes on close", () => {
    const { unmount } = render(<StepSequencePanel />);
    openPanel();

    expect(emitSpy).toHaveBeenCalledWith("game:pause-requested", {
      reason: "step-sequence",
    });

    unmount();

    expect(emitSpy).toHaveBeenCalledWith("game:resume-requested", {
      reason: "step-sequence",
    });
  });

  it("swaps the play button for a replay button once the video runs", () => {
    render(<StepSequencePanel />);
    openPanel();

    const video = screen.getByLabelText("Vídeo dos passos de quadrilha");
    expect(video).toHaveAttribute("src", FIXTURE.videoPath);
    expect(
      screen.queryByLabelText("Repetir vídeo dos passos de quadrilha"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText("Reproduzir vídeo dos passos de quadrilha"),
    );

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(
      screen.getByLabelText("Repetir vídeo dos passos de quadrilha"),
    ).toBeInTheDocument();
  });

  it("rejects an incomplete sequence and stays open", () => {
    render(<StepSequencePanel />);
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(emitSpy).toHaveBeenCalledWith("ui:step-rejected", {
      instanceId: "quadrilha-1",
      slotIndex: 0,
      stepId: "",
    });
    // One attempt-level rejection, however many slots were wrong.
    expect(rejectionCalls()).toEqual([
      {
        instanceId: "quadrilha-1",
        attemptNumber: 1,
        wrongCount: 2,
        correctCount: 0,
        totalSlots: 2,
      },
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Alguns passos estão fora de ordem.",
    );
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:step-sequence-submit",
      expect.anything(),
    );
    expect(useGameUIStore.getState().stepSequenceOpen).toBe(true);
  });

  it("numbers each failed attempt of the same panel session", () => {
    render(<StepSequencePanel />);
    openPanel();

    const confirm = screen.getByRole("button", { name: /confirmar/i });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(rejectionCalls().map((c) => c.attemptNumber)).toEqual([1, 2]);
  });

  it("submits and closes once every slot holds the expected step", () => {
    render(<StepSequencePanel />);
    openPanel({ filledSlots: [FIRST_STEP, SECOND_STEP] });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(emitSpy).toHaveBeenCalledWith("ui:step-sequence-submit", {
      instanceId: "quadrilha-1",
      placedSteps: [FIRST_STEP, SECOND_STEP],
    });
    expect(rejectionCalls()).toEqual([]);
    expect(useGameUIStore.getState().stepSequenceOpen).toBe(false);
  });

  it("restores a locked slot and removes its card from the carousel", () => {
    render(<StepSequencePanel />);
    openPanel({ filledSlots: [FIRST_STEP, null] });

    const restored = FIXTURE.availableSteps.find((c) => c.id === FIRST_STEP);
    const stillFree = FIXTURE.availableSteps.find((c) => c.id !== FIRST_STEP);

    // The saved step is back in its slot, named rather than empty...
    expect(screen.getByTestId("step-slot-0")).toHaveAttribute(
      "aria-label",
      `Passo 1: ${restored?.name}`,
    );
    expect(screen.getByTestId("step-slot-1")).toHaveAttribute(
      "aria-label",
      "Passo 2 vazio",
    );

    // ...and the carousel no longer shows the restored card at all.
    expect(
      screen.queryByLabelText(restored?.name as string),
    ).not.toBeInTheDocument();
    // An untouched card still appears and is draggable.
    expect(screen.getByLabelText(stillFree?.name as string)).toHaveAttribute(
      "aria-roledescription",
      "draggable",
    );
  });

  it("closes on Escape", () => {
    render(<StepSequencePanel />);
    openPanel();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:step-sequence-close", undefined);
    expect(useGameUIStore.getState().stepSequenceOpen).toBe(false);
  });

  it("closes when the close button is clicked", () => {
    render(<StepSequencePanel />);
    openPanel();

    fireEvent.click(screen.getByLabelText("Fechar"));

    expect(emitSpy).toHaveBeenCalledWith("ui:step-sequence-close", undefined);
    expect(useGameUIStore.getState().stepSequenceOpen).toBe(false);
    // The unmount cleanup already plays the modal-close sfx; a click sound on
    // top of it reads as the same sound played twice.
    expect(emitSpy).not.toHaveBeenCalledWith("ui:sound-click", undefined);
  });
});
