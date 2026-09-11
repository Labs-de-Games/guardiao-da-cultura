import "server-only";
import type { DateRange } from "../types";

export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
// Brazil permanently abolished DST in 2019 (Lei nº ... via decree), so a
// fixed UTC-3 offset is safe for this reportable window — it only ever
// covers dates from #740's deploy date onward. Revisit if that ever
// changes. No date library exists in this repo (verified in discovery
// §3.2); Intl does the timezone-aware part, this constant does the rest.
const SAO_PAULO_UTC_OFFSET_HOURS = 3;

/**
 * The reportable window's start — set once #740's deploy date is known
 * (see #739(d) / implementation-plan step 5). `null` means "no clamp yet",
 * which is only correct before that step ships; `all-time` and an
 * unbounded `custom` range must never resolve to before this once it is
 * set. See docs/specs/discovery-738-dashboard-edital.md §2.4, §7.
 */
export let EDITAL_PERIOD_START: Date | null = null;

/** Test-only: step 5 will replace this pattern with the real constant. */
export function __setEditalPeriodStartForTests(date: Date | null): void {
  EDITAL_PERIOD_START = date;
}

function saoPauloDateParts(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** 00:00:00 local (São Paulo) on the civil day `date` falls on, as a UTC instant. */
function saoPauloCivilDayStart(date: Date): Date {
  const { year, month, day } = saoPauloDateParts(date);
  return new Date(
    Date.UTC(year, month - 1, day, SAO_PAULO_UTC_OFFSET_HOURS, 0, 0, 0),
  );
}

/** 23:59:59.999 local (São Paulo) on the same civil day, as a UTC instant. */
function saoPauloCivilDayEnd(date: Date): Date {
  return new Date(
    saoPauloCivilDayStart(date).getTime() + 24 * 60 * 60 * 1000 - 1,
  );
}

/**
 * Parses a plain `YYYY-MM-DD` string as a São Paulo *calendar* date and
 * returns 00:00:00 local for that date, as a UTC instant.
 *
 * Deliberately does NOT go through `new Date(dateStr)` +
 * `saoPauloCivilDayStart` — `new Date("2026-02-15")` parses as UTC
 * midnight, which is 2026-02-14 21:00 in São Paulo (UTC-3), so
 * re-deriving the civil day from that instant silently returns the
 * *previous* calendar day. A `custom` range's `start`/`end` are calendar
 * dates the caller means literally, not UTC instants to re-project.
 */
function saoPauloCivilDayStartFromDateString(dateString: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateString);
  if (!match) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  const [, year, month, day] = match;
  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      SAO_PAULO_UTC_OFFSET_HOURS,
      0,
      0,
      0,
    ),
  );
}

function saoPauloCivilDayEndFromDateString(dateString: string): Date {
  return new Date(
    saoPauloCivilDayStartFromDateString(dateString).getTime() +
      24 * 60 * 60 * 1000 -
      1,
  );
}

export interface ResolvedDateRange {
  from: Date;
  to: Date;
}

function clampToPeriodStart(from: Date): Date {
  if (EDITAL_PERIOD_START && from < EDITAL_PERIOD_START) {
    return EDITAL_PERIOD_START;
  }
  return from;
}

/**
 * Resolves a client-supplied `DateRange` into concrete UTC instants,
 * anchored to São Paulo civil-day boundaries. `now` is injectable for
 * tests; defaults to the real current time.
 */
export function resolveDateRange(
  range: DateRange,
  now: Date = new Date(),
): ResolvedDateRange {
  switch (range.type) {
    case "today":
      return {
        from: clampToPeriodStart(saoPauloCivilDayStart(now)),
        to: saoPauloCivilDayEnd(now),
      };
    case "7d": {
      const from = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return {
        from: clampToPeriodStart(saoPauloCivilDayStart(from)),
        to: saoPauloCivilDayEnd(now),
      };
    }
    case "30d": {
      const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      return {
        from: clampToPeriodStart(saoPauloCivilDayStart(from)),
        to: saoPauloCivilDayEnd(now),
      };
    }
    case "all-time":
      return {
        from: EDITAL_PERIOD_START ?? new Date(0),
        to: saoPauloCivilDayEnd(now),
      };
    case "custom": {
      const requestedFrom = saoPauloCivilDayStartFromDateString(range.start);
      const requestedTo = saoPauloCivilDayEndFromDateString(range.end);
      return {
        from: clampToPeriodStart(requestedFrom),
        to: requestedTo,
      };
    }
    default: {
      // Exhaustiveness guard — a new DateRange variant must be handled
      // above, or this fails to compile.
      const exhaustive: never = range;
      throw new Error(
        `Unhandled DateRange type: ${JSON.stringify(exhaustive)}`,
      );
    }
  }
}
