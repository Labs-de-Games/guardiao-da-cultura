import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { fetchFunnel } from "@/lib/edital/server/metrics";
import { resolveEditalRequestContext } from "@/lib/edital/server/routeGuard";
import type { EditalFunnelResponse } from "@/lib/edital/types";

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await resolveEditalRequestContext(request);

  if (ctx.kind === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.kind === "invalid-params") {
    return NextResponse.json({ error: ctx.message }, { status: 400 });
  }
  if (ctx.kind === "unlinked") {
    const body: EditalFunnelResponse = { linked: false, data: null };
    return NextResponse.json(body);
  }

  try {
    const data = await fetchFunnel(ctx.scope, ctx.range, ctx.turmaSource);
    const body: EditalFunnelResponse = { linked: true, data };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar funil" },
      { status: 502 },
    );
  }
}
