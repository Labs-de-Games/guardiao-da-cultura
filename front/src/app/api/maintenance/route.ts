import { NextResponse } from "next/server";
import { isMaintenanceModeEnabled } from "@/lib/maintenance";

// Lets an open maintenance page notice when a redeploy turned the flag off.
// Outside the middleware matcher, like /api/health.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { active: isMaintenanceModeEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
