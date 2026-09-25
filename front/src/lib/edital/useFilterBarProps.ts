import type { DateRange } from "./types";

/**
 * True once a `custom` range has both bounds filled in. Gates fetches so
 * picking "Personalizado" doesn't immediately fire `from=&to=` at the API
 * (the server's zod schema rejects empty bounds with a 400, which was
 * surfacing as a spurious error the instant the option was selected).
 */
export function isDateRangeComplete(range: DateRange): boolean {
  return range.type !== "custom" || (range.start !== "" && range.end !== "");
}

/**
 * `isDateRangeComplete` plus ordering: a `custom` range with `start` after
 * `end` is "complete" (both fields filled) but not safe to fetch — the
 * server has no way to resolve an inverted window. Use this, not
 * `isDateRangeComplete`, to gate `useAsyncData`/CSV export.
 */
export function isDateRangeValid(range: DateRange): boolean {
  if (!isDateRangeComplete(range)) return false;
  if (range.type !== "custom") return true;
  return range.start <= range.end;
}

/** FilterBar's string interface (issue #745, kept for backward compat). */
function dateRangeToFilterBarValue(range: DateRange): string {
  if (range.type === "7d") return "last-7-days";
  if (range.type === "30d") return "last-30-days";
  if (range.type === "all-time") return "all-time";
  if (range.type === "custom") return "custom";
  return "last-30-days";
}

/**
 * Bridges the typed `DateRange` state to FilterBar's props. Was
 * copy-pasted identically across all three edital pages; centralized here
 * so a fix (or a future DateRange variant) only needs to happen once.
 */
export function useFilterBarProps(
  dateRange: DateRange,
  setDateRange: (next: DateRange) => void,
) {
  return {
    dateRange: dateRangeToFilterBarValue(dateRange),
    onDateRangeChange: (value: string) => {
      if (value === "last-7-days") setDateRange({ type: "7d" });
      else if (value === "last-30-days") setDateRange({ type: "30d" });
      else if (value === "all-time") setDateRange({ type: "all-time" });
      else if (value === "custom") {
        setDateRange({ type: "custom", start: "", end: "" });
      }
    },
    customFrom: dateRange.type === "custom" ? dateRange.start : "",
    customTo: dateRange.type === "custom" ? dateRange.end : "",
    customRangeError:
      dateRange.type === "custom" &&
      isDateRangeComplete(dateRange) &&
      !isDateRangeValid(dateRange)
        ? "A data “De” deve ser anterior ou igual à data “Até”."
        : undefined,
    onCustomFromChange: (value: string) => {
      if (dateRange.type === "custom") {
        setDateRange({ ...dateRange, start: value });
      }
    },
    onCustomToChange: (value: string) => {
      if (dateRange.type === "custom") {
        setDateRange({ ...dateRange, end: value });
      }
    },
  };
}
