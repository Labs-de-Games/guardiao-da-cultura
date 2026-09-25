import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { safeRate } from "@/lib/edital/rate";
import {
  fetchCompletionRate,
  fetchPhaseClueUsage,
  fetchPhaseProgress,
  fetchPhaseQuizPassRate,
  fetchSummary,
} from "@/lib/edital/server/metrics";
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

  try {
    const [funnelData, completionRate, phaseProgress, quizPassRate, clueUsage] =
      await Promise.all([
        fetchSummary(ctx.scope, ctx.range, ctx.turmaSource),
        fetchCompletionRate(ctx.scope, ctx.range, ctx.turmaSource),
        fetchPhaseProgress(ctx.scope, ctx.range, ctx.turmaSource),
        fetchPhaseQuizPassRate(ctx.scope, ctx.range, ctx.turmaSource),
        fetchPhaseClueUsage(ctx.scope, ctx.range, ctx.turmaSource),
      ]);

    /**
     * "Progresso médio" (issue #807) — total level-completions across all
     * players who started, over the maximum possible (players * level
     * count). Derived from `phaseProgress` rather than a new HogQL query:
     * the data's already fetched, and this is just an aggregate over it.
     */
    const playersStarted = funnelData.gameplay_started ?? 0;
    const totalLevels = phaseProgress.length;
    const totalCompleted = phaseProgress.reduce(
      (sum, phase) => sum + phase.completed,
      0,
    );
    const averageProgress = safeRate(
      totalCompleted,
      playersStarted * totalLevels,
    );

    const body: EditalSummaryResponse = {
      linked: true,
      data: funnelData,
      completionRate,
      averageProgress,
      phaseProgress,
      quizPassRate,
      clueUsage,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar resumo" },
      { status: 502 },
    );
  }
}
