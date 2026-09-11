/**
 * @jest-environment node
 */
jest.mock("server-only", () => ({}));

import { __setEditalPeriodStartForTests, resolveDateRange } from "./period";

describe("resolveDateRange — São Paulo civil-day boundaries", () => {
  afterEach(() => {
    __setEditalPeriodStartForTests(null);
  });

  it("resolves 'today' for 00:30 local time to the same São Paulo civil day", () => {
    // 00:30 São Paulo (UTC-3) on 2026-03-10 == 03:30 UTC on 2026-03-10.
    const now = new Date("2026-03-10T03:30:00.000Z");
    const { from, to } = resolveDateRange({ type: "today" }, now);

    // Day start: 00:00 local == 03:00 UTC same date.
    expect(from.toISOString()).toBe("2026-03-10T03:00:00.000Z");
    // Day end: 23:59:59.999 local == 02:59:59.999 UTC next date.
    expect(to.toISOString()).toBe("2026-03-11T02:59:59.999Z");
  });

  it("resolves 'today' for 23:30 local time to the same São Paulo civil day, not the next", () => {
    // 23:30 São Paulo on 2026-03-10 == 02:30 UTC on 2026-03-11.
    const now = new Date("2026-03-11T02:30:00.000Z");
    const { from, to } = resolveDateRange({ type: "today" }, now);

    expect(from.toISOString()).toBe("2026-03-10T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-03-11T02:59:59.999Z");
  });

  it("'all-time' has no lower bound when EDITAL_PERIOD_START is unset", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const { from } = resolveDateRange({ type: "all-time" }, now);

    expect(from.getTime()).toBe(0);
  });

  it("'all-time' clamps to EDITAL_PERIOD_START once set", () => {
    const periodStart = new Date("2026-01-01T03:00:00.000Z");
    __setEditalPeriodStartForTests(periodStart);
    const now = new Date("2026-03-10T12:00:00.000Z");

    const { from } = resolveDateRange({ type: "all-time" }, now);

    expect(from.getTime()).toBe(periodStart.getTime());
  });

  it("clamps a custom range's start to EDITAL_PERIOD_START, never earlier", () => {
    const periodStart = new Date("2026-02-01T03:00:00.000Z");
    __setEditalPeriodStartForTests(periodStart);

    const { from } = resolveDateRange({
      type: "custom",
      start: "2026-01-01",
      end: "2026-03-01",
    });

    expect(from.getTime()).toBe(periodStart.getTime());
  });

  it("does not clamp a custom range that already starts after EDITAL_PERIOD_START", () => {
    __setEditalPeriodStartForTests(new Date("2026-01-01T03:00:00.000Z"));

    const { from } = resolveDateRange({
      type: "custom",
      start: "2026-02-15",
      end: "2026-03-01",
    });

    expect(from.toISOString()).toBe("2026-02-15T03:00:00.000Z");
  });

  it("'7d' spans exactly 7 São Paulo civil days ending today", () => {
    const now = new Date("2026-03-10T12:00:00.000Z");
    const { from, to } = resolveDateRange({ type: "7d" }, now);

    expect(from.toISOString()).toBe("2026-03-04T03:00:00.000Z");
    expect(to.toISOString()).toBe("2026-03-11T02:59:59.999Z");
  });
});
