import { nextRetryDelay } from "./retryDelay";

const noJitter = () => 0.5;

describe("nextRetryDelay", () => {
  it.each([
    [0, 30_000],
    [1, 60_000],
    [2, 120_000],
    [3, 240_000],
    [4, 300_000],
    [10, 300_000],
  ])("attempt %i waits %i ms without jitter", (attempt, expected) => {
    expect(nextRetryDelay(attempt, noJitter)).toBe(expected);
  });

  it("stays within ±30% jitter", () => {
    expect(nextRetryDelay(0, () => 0)).toBe(21_000);
    expect(nextRetryDelay(0, () => 1)).toBe(39_000);
  });
});
