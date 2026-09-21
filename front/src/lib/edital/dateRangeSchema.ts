import { z } from "zod";
import type { DateRange } from "./types";

/**
 * Client-safe (no server-only import) — validates the only two query
 * parameters #742's route handlers accept: `dateRange` and optional
 * `from`/`to`. Everything else about scope comes from the session, never
 * the query string (discovery §5.4's compile-time Scope guard is the
 * belt; this is the suspenders for the one remaining free-text input).
 */
const DATE_STRING_PATTERN = /^\d{4}-\d{2}-\d{2}/;

const rawQuerySchema = z
  .object({
    dateRange: z
      .enum(["today", "7d", "30d", "90d", "all-time", "custom"])
      .default("30d"),
    from: z.string().regex(DATE_STRING_PATTERN).optional(),
    to: z.string().regex(DATE_STRING_PATTERN).optional(),
  })
  .refine((data) => data.dateRange !== "custom" || (data.from && data.to), {
    message: "from and to are required when dateRange is 'custom'",
  })
  .refine(
    (data) =>
      data.dateRange !== "custom" ||
      !data.from ||
      !data.to ||
      data.from <= data.to,
    { message: "from must not be after to" },
  );

export type EditalQueryParamsInput = z.input<typeof rawQuerySchema>;

/**
 * Parses `URLSearchParams`-shaped input into a `DateRange`. Throws (via
 * `.parse`) on invalid input — route handlers should catch and return
 * 400, per issue #742's "parseiam a query string com zod."
 */
export function parseDateRangeParams(
  params: Record<string, string | undefined>,
): DateRange {
  const parsed = rawQuerySchema.parse(params);
  if (parsed.dateRange === "custom") {
    // The refine above guarantees from/to are present here.
    return {
      type: "custom",
      start: parsed.from as string,
      end: parsed.to as string,
    };
  }
  return { type: parsed.dateRange };
}
