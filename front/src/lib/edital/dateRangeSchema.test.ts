import { parseDateRangeParams } from "./dateRangeSchema";

describe("parseDateRangeParams", () => {
  it("defaults to 30d when dateRange is absent", () => {
    expect(parseDateRangeParams({})).toEqual({ type: "30d" });
  });

  it("parses today/7d/30d/all-time", () => {
    expect(parseDateRangeParams({ dateRange: "today" })).toEqual({
      type: "today",
    });
    expect(parseDateRangeParams({ dateRange: "7d" })).toEqual({ type: "7d" });
    expect(parseDateRangeParams({ dateRange: "all-time" })).toEqual({
      type: "all-time",
    });
  });

  it("parses a custom range with from/to", () => {
    expect(
      parseDateRangeParams({
        dateRange: "custom",
        from: "2026-01-01",
        to: "2026-02-01",
      }),
    ).toEqual({ type: "custom", start: "2026-01-01", end: "2026-02-01" });
  });

  it("throws when dateRange is custom but from/to are missing", () => {
    expect(() => parseDateRangeParams({ dateRange: "custom" })).toThrow();
  });

  it("throws on an unknown dateRange value", () => {
    expect(() => parseDateRangeParams({ dateRange: "bogus" })).toThrow();
  });

  it("throws on a malformed from date", () => {
    expect(() =>
      parseDateRangeParams({
        dateRange: "custom",
        from: "not-a-date",
        to: "2026-02-01",
      }),
    ).toThrow();
  });

  it("throws when from is after to", () => {
    expect(() =>
      parseDateRangeParams({
        dateRange: "custom",
        from: "2026-02-01",
        to: "2026-01-01",
      }),
    ).toThrow();
  });

  it("accepts from equal to to", () => {
    expect(
      parseDateRangeParams({
        dateRange: "custom",
        from: "2026-01-15",
        to: "2026-01-15",
      }),
    ).toEqual({ type: "custom", start: "2026-01-15", end: "2026-01-15" });
  });
});
