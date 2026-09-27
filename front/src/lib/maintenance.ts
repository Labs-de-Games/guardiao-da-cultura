/**
 * Maintenance flag reader shared by the middleware and `env.ts`. Kept free of
 * other imports so the middleware doesn't depend on the full env schema.
 * `NEXT_PUBLIC_*` is inlined at build time only when referenced literally.
 */
export function isMaintenanceModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";
}
