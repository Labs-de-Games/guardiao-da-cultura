import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  fetchQuizPassRate,
  fetchSessionDuration,
} from "@/lib/edital/server/metrics";
import { resolveEditalRequestContext } from "@/lib/edital/server/routeGuard";
import type { EditalReportResponse } from "@/lib/edital/types";

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await resolveEditalRequestContext(request);

  if (ctx.kind === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.kind === "invalid-params") {
    return NextResponse.json({ error: ctx.message }, { status: 400 });
  }
  if (ctx.kind === "unlinked") {
    const body: EditalReportResponse = { linked: false, data: null };
    return NextResponse.json(body);
  }

  const [sessionDuration, quizPassRate] = await Promise.all([
    fetchSessionDuration(ctx.scope, ctx.range, ctx.turmaSource),
    fetchQuizPassRate(ctx.scope, ctx.range, ctx.turmaSource),
  ]);

  const body: EditalReportResponse = {
    linked: true,
    data: { sessionDuration, quizPassRate },
  };
  return NextResponse.json(body);
}
