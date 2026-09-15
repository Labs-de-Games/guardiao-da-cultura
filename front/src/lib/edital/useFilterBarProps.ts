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
