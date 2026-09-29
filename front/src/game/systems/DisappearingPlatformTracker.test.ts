import { DisappearingPlatformTracker } from "./DisappearingPlatformTracker";

const DELAY = 500;
const FADE_DURATION = 300;
const RESPAWN_DELAY = 2000;

function createTracker(
  overrides: Partial<{
    delay: number;
    fadeDuration: number;
    respawnDelay: number;
  }> = {},
) {
  return new DisappearingPlatformTracker({
    delay: DELAY,
    fadeDuration: FADE_DURATION,
    respawnDelay: RESPAWN_DELAY,
    ...overrides,
  });
}

describe("DisappearingPlatformTracker", () => {
  it("does not change the tile before the delay elapses", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);

    expect(tracker.update(DELAY - 1)).toEqual([]);
  });

  it("starts fading once the delay elapses", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);

    const updates = tracker.update(DELAY + FADE_DURATION / 2);

    expect(updates).toEqual([{ key: "0,0", alpha: 0.5, collidable: true }]);
  });

  it("becomes non-collidable once fully faded", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);

    const updates = tracker.update(DELAY + FADE_DURATION);

    expect(updates).toEqual([{ key: "0,0", alpha: 0, collidable: false }]);
  });

  it("respawns after respawnDelay by fading alpha back in from 0 to 1", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);
    const goneAt = DELAY + FADE_DURATION;
    tracker.update(goneAt);

    expect(tracker.update(goneAt + RESPAWN_DELAY - 1)).toEqual([]);

    // Collision returns immediately, but the tile starts fully transparent.
    const respawnStart = goneAt + RESPAWN_DELAY;
    expect(tracker.update(respawnStart)).toEqual([
      { key: "0,0", alpha: 0, collidable: true },
    ]);

    expect(tracker.update(respawnStart + FADE_DURATION / 2)).toEqual([
      { key: "0,0", alpha: 0.5, collidable: true },
    ]);

    expect(tracker.update(respawnStart + FADE_DURATION)).toEqual([
      { key: "0,0", alpha: 1, collidable: true },
    ]);
  });

  it("respawns instantly when fadeDuration is non-positive", () => {
    const tracker = createTracker({ fadeDuration: 0 });

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);
    const goneAt = DELAY + 1;
    tracker.update(goneAt);

    expect(tracker.update(goneAt + RESPAWN_DELAY)).toEqual([
      { key: "0,0", alpha: 1, collidable: true },
    ]);
  });

  it("never respawns when respawnDelay is 0", () => {
    const tracker = createTracker({ respawnDelay: 0 });

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);
    tracker.update(DELAY + FADE_DURATION);

    expect(tracker.update(DELAY + FADE_DURATION + 1_000_000)).toEqual([]);
  });

  it("ignores repeated onStand calls while a tile is already tracked", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.onStand("0,0", DELAY - 1);

    // Had the second call reset the timer, this would not have started fading yet.
    expect(tracker.update(DELAY)).toEqual([]);
    const updates = tracker.update(DELAY + FADE_DURATION);
    expect(updates).toEqual([{ key: "0,0", alpha: 0, collidable: false }]);
  });

  it("allows a fresh cycle once a tile has fully respawned", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);
    const goneAt = DELAY + FADE_DURATION;
    tracker.update(goneAt);
    const respawnStart = goneAt + RESPAWN_DELAY;
    tracker.update(respawnStart);
    const respawnedAt = respawnStart + FADE_DURATION;
    tracker.update(respawnedAt);

    tracker.onStand("0,0", respawnedAt);

    expect(tracker.update(respawnedAt + DELAY - 1)).toEqual([]);
    expect(tracker.update(respawnedAt + DELAY)).toEqual([]);
    expect(tracker.update(respawnedAt + DELAY + FADE_DURATION)).toEqual([
      { key: "0,0", alpha: 0, collidable: false },
    ]);
  });

  it("ignores onStand while a tile is still fading back in", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);
    const goneAt = DELAY + FADE_DURATION;
    tracker.update(goneAt);
    const respawnStart = goneAt + RESPAWN_DELAY;
    tracker.update(respawnStart);

    // Player lands on it mid fade-in — should not start a second cycle.
    tracker.onStand("0,0", respawnStart + 10);

    expect(tracker.update(respawnStart + FADE_DURATION)).toEqual([
      { key: "0,0", alpha: 1, collidable: true },
    ]);
  });

  it("tracks multiple tiles independently, each on its own clock", () => {
    const tracker = createTracker();

    tracker.onStand("0,0", 0);
    tracker.onStand("1,0", 100);

    tracker.update(DELAY); // "0,0" starts fading; "1,0" still pending
    const midUpdates = tracker.update(DELAY + 100);

    // Only "0,0" has started fading so far — "1,0" lags behind by 100ms.
    expect(midUpdates.map((u) => u.key)).toEqual(["0,0"]);

    const laterUpdates = tracker.update(DELAY + 200);

    expect(laterUpdates.map((u) => u.key).sort()).toEqual(["0,0", "1,0"]);
  });

  it("treats a non-positive fadeDuration as an instant fade", () => {
    const tracker = createTracker({ fadeDuration: 0 });

    tracker.onStand("0,0", 0);
    tracker.update(DELAY);

    expect(tracker.update(DELAY + 1)).toEqual([
      { key: "0,0", alpha: 0, collidable: false },
    ]);
  });
});
