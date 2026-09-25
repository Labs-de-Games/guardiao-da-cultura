/**
 * HogQL result cells arrive as `unknown`/possibly-null — every metrics
 * fetch coerces them to a number the same way (`Number(x ?? 0)`,
 * repeated 29x across metrics.ts/globalMetrics.ts). One helper so that
 * shape has one definition instead of 29 copies.
 */
export function toNumber(value: unknown): number {
  return Number(value ?? 0);
}
