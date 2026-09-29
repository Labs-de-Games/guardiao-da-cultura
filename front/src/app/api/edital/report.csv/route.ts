import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { toCsv } from "@/lib/edital/server/csv";
import {
  fetchCompletionRate,
  fetchPhaseClueUsage,
  fetchPhaseProgress,
  fetchPhaseQuizPassRate,
  fetchPhaseStars,
  fetchQuizPassRate,
  fetchSessionDuration,
} from "@/lib/edital/server/metrics";
import { resolveEditalRequestContext } from "@/lib/edital/server/routeGuard";

/** Defensive cap — discovery §7's "row cap on CSV" ClickHouse-scan mitigation. */
export const MAX_CSV_ROWS = 1000;

interface ReportRow extends Record<string, unknown> {
  metric: string;
  value: string | number;
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

  try {
    const [
      sessionDuration,
      quizPassRate,
      completionRate,
      phaseProgress,
      phaseQuizPassRate,
      phaseClueUsage,
      phaseStars,
    ] = await Promise.all([
      fetchSessionDuration(ctx.scope, ctx.range, ctx.turmaSource),
      fetchQuizPassRate(ctx.scope, ctx.range, ctx.turmaSource),
      fetchCompletionRate(ctx.scope, ctx.range, ctx.turmaSource),
      fetchPhaseProgress(ctx.scope, ctx.range, ctx.turmaSource),
      fetchPhaseQuizPassRate(ctx.scope, ctx.range, ctx.turmaSource),
      fetchPhaseClueUsage(ctx.scope, ctx.range, ctx.turmaSource),
      fetchPhaseStars(ctx.scope, ctx.range, ctx.turmaSource),
    ]);

    // Self-describing metadata rows — issue #807: a file downloaded for one
    // turma must say which one, once it's saved locally with no surrounding
    // page context.
    const metadataRows: ReportRow[] = [
      { metric: "institution", value: ctx.scope.slug },
      { metric: "turma", value: ctx.turmaSource ?? "toda a instituição" },
      { metric: "period_from", value: ctx.range.from.toISOString() },
      { metric: "period_to", value: ctx.range.to.toISOString() },
    ];

    const summaryRows: ReportRow[] = [
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
      { metric: "completion_rate", value: completionRate.value },
      { metric: "completed", value: completionRate.numerator },
      { metric: "started", value: completionRate.denominator },
    ];

    // One block of rows per level — reached/completed/quiz pass rate/clues/
    // stars, the same per-phase breakdown Resumo Executivo shows, now
    // actually exportable. A level with no quiz (the investigation) leaves
    // those values empty rather than a misleading 0. Stars are out of 5.
    const phaseRows: ReportRow[] = phaseProgress.flatMap((phase) => {
      const quiz = phaseQuizPassRate.find(
        (row) => row.levelId === phase.levelId,
      );
      const clue = phaseClueUsage.find((row) => row.levelId === phase.levelId);
      const stars = phaseStars.find((row) => row.levelId === phase.levelId);
      const prefix = `phase_${phase.levelNumber}`;
      return [
        { metric: `${prefix}_reached`, value: phase.reached },
        { metric: `${prefix}_completed`, value: phase.completed },
        { metric: `${prefix}_quiz_pass_rate`, value: quiz?.rate.value ?? "" },
        { metric: `${prefix}_quiz_passed`, value: quiz?.rate.numerator ?? "" },
        {
          metric: `${prefix}_quiz_total_attempts`,
          value: quiz?.rate.denominator ?? "",
        },
        { metric: `${prefix}_clues`, value: clue?.clues ?? 0 },
        { metric: `${prefix}_avg_stars`, value: stars?.avgStars ?? 0 },
      ];
    });

    const rows = [...metadataRows, ...summaryRows, ...phaseRows].slice(
      0,
      MAX_CSV_ROWS,
    );

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
  } catch {
    return NextResponse.json(
      { error: "Erro ao gerar relatório CSV" },
      { status: 502 },
    );
  }
}
