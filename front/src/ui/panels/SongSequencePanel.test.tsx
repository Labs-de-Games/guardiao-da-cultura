import { act, fireEvent, render, screen } from "@testing-library/react";
import { buildSongSequenceData } from "@/game/data/songSequenceContent";
import { EventBus } from "@/shared/events/event-bus";
import type { SongSequenceOpenData } from "@/shared/events/game-events";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { SongSequencePanel } from "./SongSequencePanel";

// Built through the real resolver so the fixture cannot drift from the
// blank/tray shape the game actually emits.
const FIXTURE = buildSongSequenceData("cabana-1") as SongSequenceOpenData;
const [BLANK_0, BLANK_1, BLANK_2] = FIXTURE.blankIndices;

function openPanel(overrides: Partial<SongSequenceOpenData> = {}) {
  act(() => {
    useGameUIStore.setState({
      songSequenceOpen: true,
      songSequenceData: { ...FIXTURE, ...overrides },
    });
  });
}

let emitSpy: jest.SpyInstance;

function closePayload() {
  const call = emitSpy.mock.calls.find(
    ([event]) => event === "ui:song-sequence-close",
  );
  return call?.[1];
}

beforeEach(() => {
  emitSpy = jest.spyOn(EventBus, "emit");
  act(() => {
    useGameUIStore.setState({
      songSequenceOpen: false,
      songSequenceData: null,
    });
  });
  jest.clearAllMocks();
});

describe("SongSequencePanel", () => {
  it("renders nothing while closed", () => {
    const { container } = render(<SongSequencePanel />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the title and every tray note as a button, on a fresh open", () => {
    render(<SongSequencePanel />);
    openPanel();

    expect(screen.getByText("Sanfona do Forró")).toBeInTheDocument();
    for (const item of FIXTURE.tray) {
      expect(
        screen.getByRole("button", { name: item.note }),
      ).toBeInTheDocument();
    }
  });

  it("pauses the game on open and resumes on unmount", () => {
    const { unmount } = render(<SongSequencePanel />);
    openPanel();

    expect(emitSpy).toHaveBeenCalledWith("game:pause-requested", {
      reason: "song-sequence",
    });

    unmount();

    expect(emitSpy).toHaveBeenCalledWith("game:resume-requested", {
      reason: "song-sequence",
    });
  });

  it("toggles the play button to Stop while the sequence plays, and back on click", () => {
    jest.useFakeTimers();
    render(<SongSequencePanel />);
    openPanel();

    fireEvent.click(screen.getByRole("button", { name: /tocar sequência/i }));
    expect(
      screen.getByRole("button", { name: /parar sequência/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /parar sequência/i }));
    expect(
      screen.getByRole("button", { name: /tocar sequência/i }),
    ).toBeInTheDocument();

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("gripping a tray note and placing it via keyboard nav updates the board", () => {
    render(<SongSequencePanel />);
    openPanel();

    const note = FIXTURE.slots[BLANK_0].note as string;
    fireEvent.click(screen.getByRole("button", { name: note }));

    // Each keydown must commit its own render before the next fires, or the
    // window listener (which reads state through a ref refreshed at render
    // time) still sees the pre-MOVE focusRow when Enter is dispatched.
    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "Enter" });

    fireEvent.click(screen.getByLabelText("Fechar"));

    expect(closePayload()?.board[BLANK_0]).toBe(`blank-${BLANK_0}`);
  });

  it("confirming with one correct and two wrong blanks locks only the correct one and keeps the panel open", () => {
    jest.useFakeTimers();
    render(<SongSequencePanel />);
    openPanel({
      board: {
        [BLANK_0]: `blank-${BLANK_0}`,
        [BLANK_1]: "decoy-C3",
        [BLANK_2]: "decoy-D4",
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(useGameUIStore.getState().songSequenceOpen).toBe(true);
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:song-sequence-submit",
      expect.anything(),
    );

    fireEvent.click(screen.getByLabelText("Fechar"));

    expect(closePayload()?.lockedSlots).toEqual([BLANK_0]);

    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("confirming once every blank is correct emits submit and closes", () => {
    render(<SongSequencePanel />);
    openPanel({
      board: {
        [BLANK_0]: `blank-${BLANK_0}`,
        [BLANK_1]: `blank-${BLANK_1}`,
        [BLANK_2]: `blank-${BLANK_2}`,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(emitSpy).toHaveBeenCalledWith("ui:song-sequence-submit", {
      instanceId: "cabana-1",
    });
    expect(useGameUIStore.getState().songSequenceOpen).toBe(false);
  });

  it("resuming with one slot already locked still submits once the rest are correct", () => {
    render(<SongSequencePanel />);
    openPanel({
      lockedSlots: [BLANK_0],
      board: {
        [BLANK_0]: `blank-${BLANK_0}`,
        [BLANK_1]: `blank-${BLANK_1}`,
        [BLANK_2]: `blank-${BLANK_2}`,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(emitSpy).toHaveBeenCalledWith("ui:song-sequence-submit", {
      instanceId: "cabana-1",
    });
    expect(useGameUIStore.getState().songSequenceOpen).toBe(false);
  });

  it("closes on Escape and reports the current board and lockedSlots", () => {
    render(<SongSequencePanel />);
    openPanel({ lockedSlots: [BLANK_0] });

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(closePayload()).toEqual({
      instanceId: "cabana-1",
      board: FIXTURE.board,
      lockedSlots: [BLANK_0],
    });
    expect(useGameUIStore.getState().songSequenceOpen).toBe(false);
  });

  it("Escape cancels an active grip instead of closing the panel", () => {
    render(<SongSequencePanel />);
    openPanel();

    const note = FIXTURE.slots[BLANK_0].note as string;
    fireEvent.click(screen.getByRole("button", { name: note }));

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useGameUIStore.getState().songSequenceOpen).toBe(true);
    expect(emitSpy).not.toHaveBeenCalledWith(
      "ui:song-sequence-close",
      expect.anything(),
    );

    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });

    expect(useGameUIStore.getState().songSequenceOpen).toBe(false);
  });

  it("closes when the close button is clicked, without double-firing a sound", () => {
    render(<SongSequencePanel />);
    openPanel();

    fireEvent.click(screen.getByLabelText("Fechar"));

    expect(closePayload()).toEqual({
      instanceId: "cabana-1",
      board: FIXTURE.board,
      lockedSlots: [],
    });
    expect(useGameUIStore.getState().songSequenceOpen).toBe(false);
    // The unmount cleanup already plays the modal-close sfx; a click sound on
    // top of it reads as the same sound played twice.
    expect(emitSpy).not.toHaveBeenCalledWith("ui:sound-click", undefined);
  });
});
