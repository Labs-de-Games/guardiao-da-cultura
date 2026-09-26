import { isMaintenanceModeEnabled } from "./maintenance";

describe("isMaintenanceModeEnabled", () => {
  const original = process.env.NEXT_PUBLIC_MAINTENANCE_MODE;

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = original;
  });

  it("is enabled only by the exact string 'true'", () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = "true";
    expect(isMaintenanceModeEnabled()).toBe(true);
  });

  it.each(["", "false", "TRUE", "1", "yes"])("is disabled for %p", (value) => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = value;
    expect(isMaintenanceModeEnabled()).toBe(false);
  });
});
