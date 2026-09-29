import { formatStars, starsFraction } from "./stars";

describe("formatStars", () => {
  it("shows the average out of 5", () => {
    expect(formatStars({ avgStars: 3.4, players: 10 })).toBe("3,4 / 5 ★");
  });

  it("rounds to one decimal", () => {
    expect(formatStars({ avgStars: 2.75, players: 3 })).toBe("2,8 / 5 ★");
  });
});

describe("starsFraction", () => {
  it("is the average over 5", () => {
    expect(starsFraction({ avgStars: 2.5, players: 1 })).toBe(0.5);
  });

  it("never exceeds 1", () => {
    expect(starsFraction({ avgStars: 6, players: 1 })).toBe(1);
  });
});
