import {
  buildSongSequenceData,
  pickBlankIndices,
  SONG_SCORE,
  type SongSequenceSessionState,
} from "./songSequenceContent";

describe("pickBlankIndices", () => {
  it("picks exactly 3 indices, each pointing at a non-null note", () => {
    for (let i = 0; i < 20; i++) {
      const indices = pickBlankIndices(SONG_SCORE);

      expect(indices).toHaveLength(3);
      for (const index of indices) {
        expect(SONG_SCORE[index].note).not.toBeNull();
      }
    }
  });

  it("never picks two indices sharing the same note letter", () => {
    for (let i = 0; i < 20; i++) {
      const indices = pickBlankIndices(SONG_SCORE);
      const notes = indices.map((index) => SONG_SCORE[index].note);

      expect(new Set(notes).size).toBe(notes.length);
    }
  });

  it("returns indices in ascending order", () => {
    for (let i = 0; i < 20; i++) {
      const indices = pickBlankIndices(SONG_SCORE);

      expect(indices).toEqual([...indices].sort((a, b) => a - b));
    }
  });
});

describe("buildSongSequenceData — fresh build", () => {
  it("wires instanceId, slots and an empty lockedSlots", () => {
    const data = buildSongSequenceData("PH_song_a");

    expect(data.instanceId).toBe("PH_song_a");
    expect(data.slots).toEqual(SONG_SCORE);
    expect(data.lockedSlots).toEqual([]);
  });

  it("builds a board keyed only by the picked blank indices, all null", () => {
    const data = buildSongSequenceData("PH_song_b");

    expect(
      Object.keys(data.board)
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([...data.blankIndices].sort((a, b) => a - b));
    for (const index of data.blankIndices) {
      expect(data.board[index]).toBeNull();
    }
  });

  it("builds a tray of exactly 3 answer tokens and 3 fixed decoys, every note unique", () => {
    const data = buildSongSequenceData("PH_song_c");

    expect(data.tray).toHaveLength(6);
    const answerIds = data.tray
      .map((t) => t.id)
      .filter((id) => id.startsWith("blank-"))
      .sort();
    const decoyIds = data.tray
      .map((t) => t.id)
      .filter((id) => id.startsWith("decoy-"))
      .sort();

    expect(answerIds).toEqual(
      data.blankIndices.map((index) => `blank-${index}`).sort(),
    );
    expect(decoyIds).toEqual(["decoy-C3", "decoy-D4", "decoy-F4"]);
    expect(new Set(data.tray.map((t) => t.note)).size).toBe(6);
  });

  it("each answer tray token's note matches its slot's actual note", () => {
    const data = buildSongSequenceData("PH_song_d");

    for (const index of data.blankIndices) {
      const token = data.tray.find((t) => t.id === `blank-${index}`);
      expect(token?.note).toBe(SONG_SCORE[index].note);
    }
  });

  it("produces different blank selections or tray orders across repeated fresh calls", () => {
    const runs = Array.from({ length: 10 }, () => {
      const data = buildSongSequenceData("PH_song_e");
      return `${data.blankIndices.join(",")}|${data.tray.map((t) => t.id).join(",")}`;
    });

    expect(new Set(runs).size).toBeGreaterThan(1);
  });
});

describe("buildSongSequenceData — session/resume branch", () => {
  const session: SongSequenceSessionState = {
    blankIndices: [0, 4, 8],
    trayOrder: [
      "decoy-C3",
      "blank-0",
      "blank-4",
      "decoy-D4",
      "blank-8",
      "decoy-F4",
    ],
    board: { 0: "blank-0", 4: null, 8: null },
    lockedSlots: [0],
  };

  it("reuses blankIndices, board and lockedSlots verbatim from the session", () => {
    const data = buildSongSequenceData("PH_song_f", session);

    expect(data.blankIndices).toEqual(session.blankIndices);
    expect(data.board).toEqual(session.board);
    expect(data.lockedSlots).toEqual(session.lockedSlots);
  });

  it("rebuilds tray items from trayOrder in the same order, not reshuffled", () => {
    const data = buildSongSequenceData("PH_song_g", session);

    expect(data.tray.map((t) => t.id)).toEqual(session.trayOrder);
  });

  it("resolves each resumed tray token's note from its id convention", () => {
    const data = buildSongSequenceData("PH_song_h", session);

    expect(data.tray.find((t) => t.id === "blank-0")?.note).toBe(
      SONG_SCORE[0].note,
    );
    expect(data.tray.find((t) => t.id === "blank-4")?.note).toBe(
      SONG_SCORE[4].note,
    );
    expect(data.tray.find((t) => t.id === "decoy-C3")?.note).toBe("C3");
    expect(data.tray.find((t) => t.id === "decoy-D4")?.note).toBe("D4");
  });
});
