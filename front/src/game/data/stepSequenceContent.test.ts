import {
  buildStepSequenceData,
  STEP_SEQUENCE_VIDEO,
} from "./stepSequenceContent";

const IDS = ["balance", "side_step", "spin", "caipira_jump"];

describe("buildStepSequenceData", () => {
  it("treats the authored order as the expected answer", () => {
    const data = buildStepSequenceData("PH_a", IDS);

    expect(data?.expectedSequence).toEqual(IDS);
    expect(data?.instanceId).toBe("PH_a");
    expect(data?.videoPath).toBe(STEP_SEQUENCE_VIDEO);
  });

  it("reads a comma-separated id the same as a list", () => {
    const fromList = buildStepSequenceData("PH_b", IDS);
    const fromString = buildStepSequenceData(
      "PH_b",
      " balance, side_step,spin ,caipira_jump ",
    );

    expect(fromString?.expectedSequence).toEqual(fromList?.expectedSequence);
  });

  it("resolves each frame path by convention from its id", () => {
    const data = buildStepSequenceData("PH_c", IDS);

    for (const card of data?.availableSteps ?? []) {
      expect(card.imagePath).toBe(
        `/assets/artworks/dance/steps/${card.id}.gif`,
      );
    }
  });

  it("offers every step exactly once", () => {
    const data = buildStepSequenceData("PH_d", IDS);
    const offered = data?.availableSteps.map((c) => c.id) ?? [];

    expect([...offered].sort()).toEqual([...IDS].sort());
    expect(new Set(offered).size).toBe(IDS.length);
  });

  it("labels cards by carousel position, never by their place in the answer", () => {
    const data = buildStepSequenceData("PH_e", IDS);

    expect(data?.availableSteps.map((c) => c.name)).toEqual([
      "Passo A",
      "Passo B",
      "Passo C",
      "Passo D",
    ]);
  });

  it("keeps the carousel order stable across reopens of the same placeholder", () => {
    const first = buildStepSequenceData("PH_f", IDS);
    const second = buildStepSequenceData("PH_f", IDS);

    expect(second?.availableSteps.map((c) => c.id)).toEqual(
      first?.availableSteps.map((c) => c.id),
    );
  });

  it("shuffles each placeholder independently", () => {
    // Enough distinct instances that identical orders across all of them would
    // mean the cache key is being ignored, not just an unlucky draw.
    const orders = ["PH_g", "PH_h", "PH_i", "PH_j", "PH_k"].map((id) =>
      buildStepSequenceData(id, IDS)
        ?.availableSteps.map((c) => c.id)
        .join(","),
    );

    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it("passes saved slot progress through to the panel payload", () => {
    const saved = ["balance", null, null, null];
    const data = buildStepSequenceData("PH_p", IDS, saved);

    expect(data?.filledSlots).toEqual(saved);
  });

  it("leaves filledSlots undefined on a first open", () => {
    expect(buildStepSequenceData("PH_q", IDS)?.filledSlots).toBeUndefined();
  });

  it("rejects a placeholder carrying fewer than two ids", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

    expect(buildStepSequenceData("PH_l", "quadrilha_1")).toBeNull();
    expect(buildStepSequenceData("PH_m", [])).toBeNull();
    expect(buildStepSequenceData("PH_n", "")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(3);

    warn.mockRestore();
  });

  it("ignores empty entries left behind by a trailing comma", () => {
    const data = buildStepSequenceData("PH_o", "balance,side_step,");

    expect(data?.expectedSequence).toEqual(["balance", "side_step"]);
  });
});
