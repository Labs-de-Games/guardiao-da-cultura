import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/edital/server/csv";
import {
  fetchCriticalErrors,
  fetchQuizPassRate,
  fetchSessionDuration,
} from "@/lib/edital/server/metrics";
import { resolveEditalRequestContext } from "@/lib/edital/server/routeGuard";

/** Defensive cap — discovery §7's "row cap on CSV" ClickHouse-scan mitigation. */
export const MAX_CSV_ROWS = 1000;

interface ReportRow extends Record<string, unknown> {
  metric: string;
  value: number;
}

export async function GET(request: NextRequest): Promise<Response> {
  const ctx = await resolveEditalRequestContext(request);

  if (ctx.kind === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (ctx.kind === "invalid-params") {
    return NextResponse.json({ error: ctx.message }, { status: 400 });
  }
  if (ctx.kind === "unlinked") {
    // No CSV to export — the caller isn't linked to an institution yet.
    return NextResponse.json(
      { error: "Account not linked to an institution" },
      { status: 404 },
    );
  }

  const [sessionDuration, criticalErrors, quizPassRate] = await Promise.all([
    fetchSessionDuration(ctx.scope, ctx.range),
    fetchCriticalErrors(ctx.scope, ctx.range),
    fetchQuizPassRate(ctx.scope, ctx.range),
  ]);

  const rows: ReportRow[] = [
    { metric: "sessions_started", value: sessionDuration.sessionsStarted },
    {
      metric: "avg_session_duration_seconds",
      value: sessionDuration.avgSeconds,
    },
    {
      metric: "median_session_duration_seconds",
      value: sessionDuration.medianSeconds,
    },
    { metric: "quiz_pass_rate", value: quizPassRate.value },
    { metric: "quiz_passed", value: quizPassRate.numerator },
    { metric: "quiz_total_attempts", value: quizPassRate.denominator },
    { metric: "critical_errors_total", value: criticalErrors.total },
    ...Object.entries(criticalErrors.byErrorCode).map(([code, count]) => ({
      metric: `critical_errors_${code}`,
      value: count,
    })),
  ].slice(0, MAX_CSV_ROWS);

  const csv = toCsv(rows, [
    { key: "metric", header: "Métrica" },
    { key: "value", header: "Valor" },
  ]);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relatorio-edital.csv"',
      "Cache-Control": "no-store",
    },
  });
}
