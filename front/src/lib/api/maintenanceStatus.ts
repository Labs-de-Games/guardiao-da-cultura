const MAINTENANCE_STATUS_PATH = "/api/maintenance";

/**
 * Asks the front whether planned maintenance is still on. Any failure counts
 * as "still active" so a flaky check never sends players back too early.
 */
export async function isMaintenanceActive(): Promise<boolean> {
  try {
    const response = await fetch(MAINTENANCE_STATUS_PATH, {
      cache: "no-store",
    });
    if (!response.ok) return true;
    const data = (await response.json()) as { active?: unknown };
    return data.active !== false;
  } catch {
    return true;
  }
}
