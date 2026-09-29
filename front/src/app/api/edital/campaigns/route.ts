import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchCampaigns } from "@/lib/edital/server/metrics";
import { resolveEditalRequestContext } from "@/lib/edital/server/routeGuard";
import type { EditalCampaignsResponse } from "@/lib/edital/types";

/**
 * No campaign/slug parameter, per discovery §2.6: the breakdown is
 * always for the caller's own slug (from the session), never a
 * request-supplied one — resolveEditalRequestContext already enforces
 * this the same way every other /api/edital/* route does.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await resolveEditalRequestContext(request);

  if (ctx.kind === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.kind === "invalid-params") {
    return NextResponse.json({ error: ctx.message }, { status: 400 });
  }
  if (ctx.kind === "unlinked") {
    const body: EditalCampaignsResponse = { linked: false, data: null };
    return NextResponse.json(body);
  }

  try {
    const data = await fetchCampaigns(ctx.scope, ctx.range);
    const body: EditalCampaignsResponse = { linked: true, data };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar campanhas" },
      { status: 502 },
    );
  }
}
