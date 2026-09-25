import "server-only";
import { serverEnv } from "../../env-server";
import type { DateRange } from "../types";

export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";
// Brazil permanently abolished DST in 2019 (Lei nº ... via decree), so a
// fixed UTC-3 offset is safe for this reportable window — it only ever
// covers dates from #740's deploy date onward. Revisit if that ever
// changes. No date library exists in this repo (verified in discovery
// §3.2); Intl does the timezone-aware part, this constant does the rest.
const SAO_PAULO_UTC_OFFSET_HOURS = 3;

const NO_OVERRIDE = Symbol("no-period-start-override");
let periodStartOverrideForTests: Date | null | typeof NO_OVERRIDE = NO_OVERRIDE;

/**
 * The reportable window's start is genuinely unknowable at commit time —
 * it can only honestly be #740's deploy date (discovery §2.4), and #740
 * has not shipped anywhere yet as of this step. Hardcoding a guessed date
 * here would be worse than not having one: a wrong constant silently
 * mis-scopes every "all-time" query and every unbounded custom range
 * forever, with no signal that anything is wrong.
 *
 * So this is config, not a code constant: EDITAL_PERIOD_START is read from
 * the environment (ISO date string, e.g. "2026-04-01"). Ops sets it once
 * on #740's actual deploy day — no code change, no redeploy of this file,
 * no risk of the date drifting from whatever got typed into a PR. Until
 * set, `null` means "no clamp yet", which is the only honest value before
 * that day.
 */
function getEditalPeriodStart(): Date | null {
  if (periodStartOverrideForTests !== NO_OVERRIDE) {
    return periodStartOverrideForTests;
  }
  return serverEnv.server.editalPeriodStart ?? null;
}

/** Test-only: overrides the env-derived value; pass `null` to clear the clamp. */
export function __setEditalPeriodStartForTests(date: Date | null): void {
  periodStartOverrideForTests = date;
}

/** Test-only: removes the override entirely, reverting to the env value. */
export function __clearEditalPeriodStartOverrideForTests(): void {
  periodStartOverrideForTests = NO_OVERRIDE;
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
  const periodStart = getEditalPeriodStart();
  if (periodStart && from < periodStart) {
    return periodStart;
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
    case "90d": {
      const from = new Date(now.getTime() - 89 * 24 * 60 * 60 * 1000);
      return {
        from: clampToPeriodStart(saoPauloCivilDayStart(from)),
        to: saoPauloCivilDayEnd(now),
      };
    }
    case "all-time":
      return {
        from: getEditalPeriodStart() ?? new Date(0),
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
