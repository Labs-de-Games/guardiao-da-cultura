/**
 * Every HogQL phase query (queries.ts and globalQueries.ts alike) returns
 * one row per level, keyed by the raw `level_id` in column 0 — this turns
 * those rows into a `Map` keyed by that id, with `toValue` picking
 * whatever columns matter for the caller (a single count, or a
 * `{passed, total}` pair).
 */
export function rowsToLevelMap<T>(
  rows: unknown[][],
  toValue: (row: unknown[]) => T,
): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    map.set(row[0] as string, toValue(row));
  }
  return map;
}
