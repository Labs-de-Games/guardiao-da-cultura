import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchSummary } from "@/lib/edital/server/metrics";
import { resolveEditalRequestContext } from "@/lib/edital/server/routeGuard";
import type { EditalSummaryResponse } from "@/lib/edital/types";

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await resolveEditalRequestContext(request);

  if (ctx.kind === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.kind === "invalid-params") {
    return NextResponse.json({ error: ctx.message }, { status: 400 });
  }
  if (ctx.kind === "unlinked") {
    const body: EditalSummaryResponse = { linked: false, data: null };
    return NextResponse.json(body);
  }

  const data = await fetchSummary(ctx.scope, ctx.range);
  const body: EditalSummaryResponse = { linked: true, data };
  return NextResponse.json(body);
}
