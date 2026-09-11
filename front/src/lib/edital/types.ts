/**
 * Client-safe types for the edital dashboard (epic #738). Nothing here
 * imports "server-only" or env-server — #745's client components can import
 * this module directly. Server internals (query builders, the Scope type,
 * HogQL client) live under lib/edital/server/ instead.
 *
 * See docs/specs/discovery-738-dashboard-edital.md §5.4: "Ship a
 * client-safe front/src/lib/edital/types.ts (DTOs plus the dateRange union
 * shared with the zod schema) and keep only internals under server/. As
 * written, #745 would duplicate the types or break the build."
 */

/**
 * The date-range shapes #742's route handlers accept. `custom` carries
 * explicit bounds; the server clamps them (see server/period.ts) so an
 * unbounded custom range can't re-create the full-scan problem
 * EDITAL_PERIOD_START exists to prevent.
 */
export type DateRange =
  | { type: "today" }
  | { type: "7d" }
  | { type: "30d" }
  | { type: "all-time" }
  | { type: "custom"; start: string; end: string };

/**
 * Every rate the dashboard shows is `{value, numerator, denominator}`, per
 * discovery §7's risk mitigation for "the number is not defensible to an
 * auditor" — never present an unqualified single number. `value` is always
 * in `[0, 1]`.
 */
export interface Rate {
  value: number;
  numerator: number;
  denominator: number;
}

/** Response shape of GET /api/edital/health. */
export interface EditalHealthResponse {
  configured: boolean;
}
