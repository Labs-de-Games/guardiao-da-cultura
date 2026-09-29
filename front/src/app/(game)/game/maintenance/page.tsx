import type { Metadata } from "next";
import { MaintenancePage } from "@/components/errors/ErrorPages";
import { isMaintenanceModeEnabled } from "@/lib/maintenance";

export const metadata: Metadata = { title: "Em manutenção" };
// Read the flag per request, not once at build time of this page.
export const dynamic = "force-dynamic";

export default function GameMaintenance() {
  return (
    <MaintenancePage
      reason={isMaintenanceModeEnabled() ? "scheduled" : "outage"}
    />
  );
}
