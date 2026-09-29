import { act, fireEvent, render, screen } from "@testing-library/react";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { GeniusSequencePanel } from "./GeniusSequencePanel";

// Mirrors the component's own private constants (not exported) so the
// timer math below stays traceable to the source instead of magic numbers.
const TOTAL_ROUNDS = 6;
const INITIAL_DELAY_MS = 1500;
const PLAYBACK_GAP_MS = 350;
const PLAYBACK_FLASH_MS = 450;
const ROUND_ADVANCE_DELAY_MS = INITIAL_DELAY_MS;
const SUCCESS_LABEL_DURATION_MS = 1000;
const RETRY_DELAY_MS = 1500;
const COMPLETE_CLOSE_DELAY_MS = 1300;
const STEP_MS = PLAYBACK_FLASH_MS + PLAYBACK_GAP_MS;

// Advances the fake clock in small chunks, each inside its own `act`, so
// effect-scheduled timers (registered on render commit, not inside the
// firing callback) get a chance to be picked up before the next chunk.
function advanceTime(ms: number) {
  const CHUNK = 50;
  let remaining = ms;
  while (remaining > 0) {
    const chunk = Math.min(CHUNK, remaining);
    act(() => {
      jest.advanceTimersByTime(chunk);
    });
    remaining -= chunk;
  }
}

// Delay from panel open until round 1's prefix has finished playing back
// and input is accepted.
const FIRST_INPUT_READY_MS = INITIAL_DELAY_MS + 1 * STEP_MS;

// Delay from the last correct press of a non-final round until the next
// round's prefix has finished playing back and input is accepted again.
function nextRoundReadyMs(nextRound: number) {
  return (
    PLAYBACK_FLASH_MS +
    SUCCESS_LABEL_DURATION_MS +
    ROUND_ADVANCE_DELAY_MS +
    nextRound * STEP_MS
  );
}

// Delay from a wrong press until this same round's prefix has replayed and
// input is accepted again (fail label, then retry, then the replay itself).
function retryReadyMs(round: number) {
  return PLAYBACK_FLASH_MS + RETRY_DELAY_MS + round * STEP_MS;
}

const INSTANCE_ID = "genius-1";

function openPanel() {
  act(() => {
    useGameUIStore.setState({
      geniusSequenceOpen: true,
      geniusSequenceData: { instanceId: INSTANCE_ID },
    });
  });
}

function pressColor(color: "green" | "red" | "yellow" | "blue") {
  fireEvent.click(screen.getByTestId(`genius-color-${color}`));
}

// Plays through one round by pressing the correct color (always "green",
// since Math.random is mocked below) the number of times the round
// requires, then — for every round but the last — advances the clock past
// the success/intro/playback chain so the next round is ready for input.
function playRound(round: number) {
  for (let i = 0; i < round; i++) {
    pressColor("green");
  }
  if (round < TOTAL_ROUNDS) {
    advanceTime(nextRoundReadyMs(round + 1));
  }
}

let emitSpy: jest.SpyInstance;
let randomSpy: jest.SpyInstance;

function rejectionCalls() {
  return emitSpy.mock.calls
    .filter(([event]) => event === "ui:genius-sequence-rejected")
    .map(([, payload]) => payload);
}

beforeEach(() => {
  jest.useFakeTimers();
  // COLORS = ["green", "red", "yellow", "blue"]; random() -> 0 always picks
  // index 0, so every generated round is "green" — deterministic without
  // reaching into component internals.
  randomSpy = jest.spyOn(Math, "random").mockReturnValue(0);
  emitSpy = jest.spyOn(EventBus, "emit");
  act(() => {
    useGameUIStore.setState({
      geniusSequenceOpen: false,
      geniusSequenceData: null,
    });
  });
  jest.clearAllMocks();
  randomSpy.mockReturnValue(0);
});

afterEach(() => {
  randomSpy.mockRestore();
  jest.useRealTimers();
});

describe("GeniusSequencePanel", () => {
  it("keeps the panel hidden while closed", () => {
    render(<GeniusSequencePanel />);

    expect(screen.getByText("Afine o acordeon")).not.toBeVisible();
  });

  it("renders the title, instructions and round counter on open", () => {
    render(<GeniusSequencePanel />);
    openPanel();

    expect(screen.getByText("Afine o acordeon")).toBeVisible();
    expect(
      screen.getByText(
        "Repita a sequência de sons. Use o mouse ou WASD/setas + Enter.",
      ),
    ).toBeVisible();
    expect(screen.getByText(`1/${TOTAL_ROUNDS}`)).toBeInTheDocument();
  });

  it("pauses the game while open and resumes on close", () => {
    const { unmount } = render(<GeniusSequencePanel />);
    openPanel();

    expect(emitSpy).toHaveBeenCalledWith("game:pause-requested", {
      reason: "genius-sequence",
    });

    unmount();

    expect(emitSpy).toHaveBeenCalledWith("game:resume-requested", {
      reason: "genius-sequence",
    });
  });

  it("rejects a wrong press with the exact attempt payload and stays open", () => {
    render(<GeniusSequencePanel />);
    openPanel();
    advanceTime(FIRST_INPUT_READY_MS);

    pressColor("red");

    expect(emitSpy).toHaveBeenCalledWith("ui:genius-sequence-rejected", {
      instanceId: INSTANCE_ID,
      attemptNumber: 1,
      wrongCount: 1,
      correctCount: 0,
      totalRounds: TOTAL_ROUNDS,
    });
    expect(useGameUIStore.getState().geniusSequenceOpen).toBe(true);

    advanceTime(PLAYBACK_FLASH_MS);
    expect(screen.getByText("Tente novamente")).toBeInTheDocument();
  });

  it("numbers each failed attempt of the same panel session", () => {
    render(<GeniusSequencePanel />);
    openPanel();
    advanceTime(FIRST_INPUT_READY_MS);

    pressColor("red");
    // Wait out this attempt's fail/retry/replay cycle before the next wrong
    // press, same as a real player would have to.
    advanceTime(retryReadyMs(1));
    pressColor("blue");

    expect(rejectionCalls().map((c) => c.attemptNumber)).toEqual([1, 2]);
  });

  it("advances to the next round after a correct press", () => {
    render(<GeniusSequencePanel />);
    openPanel();
    advanceTime(FIRST_INPUT_READY_MS);

    playRound(1);

    expect(screen.getByText(`2/${TOTAL_ROUNDS}`)).toBeInTheDocument();
  });

  it("completes all rounds, firing completion immediately and reward feedback only once the panel actually closes", () => {
    render(<GeniusSequencePanel />);
    openPanel();
    advanceTime(FIRST_INPUT_READY_MS);

    for (let round = 1; round < TOTAL_ROUNDS; round++) {
      playRound(round);
    }
    // Final round: completion must fire the instant the last correct press
    // lands, before the celebration screen's close delay even starts —
    // scoring can't be cancelled by closing early.
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      pressColor("green");
    }

    expect(emitSpy).toHaveBeenCalledWith("ui:genius-sequence-complete", {
      instanceId: INSTANCE_ID,
    });
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:genius-sequence-close",
      undefined,
    );
    expect(useGameUIStore.getState().geniusSequenceOpen).toBe(true);

    advanceTime(COMPLETE_CLOSE_DELAY_MS);

    expect(emitSpy).toHaveBeenCalledWith("ui:genius-sequence-close", undefined);
    expect(useGameUIStore.getState().geniusSequenceOpen).toBe(false);
  });

  it("closes on Escape", () => {
    render(<GeniusSequencePanel />);
    openPanel();

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(emitSpy).toHaveBeenCalledWith("ui:genius-sequence-close", undefined);
    expect(useGameUIStore.getState().geniusSequenceOpen).toBe(false);
  });

  it("closes when the close button is clicked", () => {
    render(<GeniusSequencePanel />);
    openPanel();

    fireEvent.click(screen.getByLabelText("Fechar"));

    expect(emitSpy).toHaveBeenCalledWith("ui:genius-sequence-close", undefined);
    expect(useGameUIStore.getState().geniusSequenceOpen).toBe(false);
  });

  it("moves focus with the keyboard before pressing with Enter", () => {
    render(<GeniusSequencePanel />);
    openPanel();
    advanceTime(FIRST_INPUT_READY_MS);

    // Default focus is "green" (the correct color); move right to "red"
    // then press Enter — surfacing as a wrong "red" attempt proves focus
    // actually moved, since the sequence is all-green. Separate `act` calls
    // so the keydown listener (closed over `focusedColor`) re-subscribes
    // with the updated value before Enter is dispatched.
    act(() => {
      fireEvent.keyDown(window, { key: "d" });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "Enter" });
    });

    expect(rejectionCalls()).toEqual([
      {
        instanceId: INSTANCE_ID,
        attemptNumber: 1,
        wrongCount: 1,
        correctCount: 0,
        totalRounds: TOTAL_ROUNDS,
      },
    ]);
  });
});
