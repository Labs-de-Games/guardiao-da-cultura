import { NudgeManager } from "./NudgeManager";

const START = 1_700_000_000_000;
const THRESHOLD = 5_000;
const COOLDOWN = 60_000;
const THROTTLE = 1_000;

function createManager() {
  return new NudgeManager({ thresholdMs: THRESHOLD, cooldownMs: COOLDOWN });
}

describe("NudgeManager", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("does not nudge before the inactivity threshold elapses", () => {
    const manager = createManager();

    expect(manager.evaluate(START + THRESHOLD - 1, false)).toBe(false);
  });

  it("nudges once the inactivity threshold elapses", () => {
    const manager = createManager();

    expect(manager.evaluate(START + THRESHOLD, false)).toBe(true);
  });

  it("never nudges while the player is busy, however long they idle", () => {
    const manager = createManager();

    expect(manager.evaluate(START + THRESHOLD * 10, true)).toBe(false);
  });

  it("does not nudge immediately after the player stops being busy", () => {
    const manager = createManager();
    const releasedAt = START + THRESHOLD * 10;

    // Time spent busy is engaged time, not idle time.
    expect(manager.evaluate(releasedAt, true)).toBe(false);
    expect(manager.evaluate(releasedAt + THROTTLE, false)).toBe(false);
    // The inactivity window restarts from the moment the player was released.
    expect(manager.evaluate(releasedAt + THRESHOLD, false)).toBe(true);
  });

  it("recordInteraction restarts the inactivity timer", () => {
    const manager = createManager();
    const interactionAt = START + THRESHOLD - 1;

    jest.setSystemTime(interactionAt);
    manager.recordInteraction();

    // The old deadline is no longer enough.
    expect(manager.evaluate(START + THRESHOLD, false)).toBe(false);
    // A full threshold measured from the interaction is.
    expect(manager.evaluate(interactionAt + THRESHOLD, false)).toBe(true);
  });

  it("suppresses further nudges for the whole cooldown window", () => {
    const manager = createManager();
    const nudgedAt = START + THRESHOLD;

    expect(manager.evaluate(nudgedAt, false)).toBe(true);
    jest.setSystemTime(nudgedAt);
    manager.recordNudge();

    expect(manager.evaluate(nudgedAt + COOLDOWN - 1, false)).toBe(false);
  });

  it("nudges again once the cooldown expires", () => {
    const manager = createManager();
    const nudgedAt = START + THRESHOLD;

    expect(manager.evaluate(nudgedAt, false)).toBe(true);
    jest.setSystemTime(nudgedAt);
    manager.recordNudge();

    expect(manager.evaluate(nudgedAt + COOLDOWN, false)).toBe(true);
  });

  it("throttles evaluations to one per second", () => {
    const manager = createManager();
    const past = START + THRESHOLD;

    expect(manager.evaluate(past, false)).toBe(true);
    expect(manager.evaluate(past + THROTTLE - 1, false)).toBe(false);
    expect(manager.evaluate(past + THROTTLE, false)).toBe(true);
  });

  it("reset clears the cooldown and the inactivity timer for a new mission", () => {
    const manager = createManager();
    const nudgedAt = START + THRESHOLD;

    expect(manager.evaluate(nudgedAt, false)).toBe(true);
    jest.setSystemTime(nudgedAt);
    manager.recordNudge();
    expect(manager.evaluate(nudgedAt + THROTTLE, false)).toBe(false);

    manager.reset("curator_l2");

    // Cooldown is gone, but the inactivity timer restarted from the reset.
    expect(manager.evaluate(nudgedAt + THROTTLE * 2, false)).toBe(false);
    expect(manager.evaluate(nudgedAt + THRESHOLD, false)).toBe(true);
  });

  it("reset is a no-op when called again with the same mission id", () => {
    const manager = createManager();

    manager.reset("curator");
    const laterInteraction = START + THRESHOLD * 5;
    jest.setSystemTime(laterInteraction);
    manager.recordInteraction();

    // A repeated reset must not restart the timer set by recordInteraction.
    manager.reset("curator");

    expect(manager.evaluate(laterInteraction + THRESHOLD, false)).toBe(true);
  });

  it("tracks the current mission id across distinct resets", () => {
    const manager = createManager();

    expect(manager.getCurrentMissionId()).toBe("");

    manager.reset("curator");
    expect(manager.getCurrentMissionId()).toBe("curator");

    manager.reset("curator_l2");
    expect(manager.getCurrentMissionId()).toBe("curator_l2");
  });
});
