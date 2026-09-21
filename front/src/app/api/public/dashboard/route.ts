import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { parseDateRangeParams } from "@/lib/edital/dateRangeSchema";
import { EDITAL_ANNUAL_PLAYER_GOAL, safeRate } from "@/lib/edital/rate";
import {
  fetchGlobalCompletionRate,
  fetchGlobalEntryRate,
  fetchGlobalOriginSplit,
  fetchGlobalPhaseDetail,
  fetchGlobalPhaseProgression,
  fetchGlobalPlayers,
  fetchGlobalPlayerTrend,
  fetchGlobalSessionDuration,
  fetchInstitutionCount,
  fetchTurmaCount,
} from "@/lib/edital/server/globalMetrics";
import { resolveDateRange } from "@/lib/edital/server/period";
import type { PublicDashboardResponse } from "@/lib/edital/types";

/**
 * Issue #808 — the public dashboard's data endpoint. Deliberately does
 * NOT call resolveEditalRequestContext (routeGuard.ts): that helper
 * requires a session and a resolved institution Scope, both meaningless
 * here — this route is intentionally unauthenticated and returns
 * cross-institution aggregate data by design, never one institution's
 * numbers. No `?slug=`/`?turma=` params exist on this route at all.
 */
export async function GET(request: NextRequest): Promise<Response> {
  let range: ReturnType<typeof resolveDateRange>;
  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const dateRange = parseDateRangeParams(params);
    range = resolveDateRange(dateRange);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid query parameters";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [
    playersUnique,
    institutionsActive,
    turmasActive,
    completionRate,
    entryRate,
    phaseProgression,
    phaseDetail,
    originSplit,
    playerTrend,
    sessionDuration,
  ] = await Promise.all([
    fetchGlobalPlayers(range),
    fetchInstitutionCount(range),
    fetchTurmaCount(range),
    fetchGlobalCompletionRate(range),
    fetchGlobalEntryRate(range),
    fetchGlobalPhaseProgression(range),
    fetchGlobalPhaseDetail(range),
    fetchGlobalOriginSplit(range),
    fetchGlobalPlayerTrend(range),
    fetchGlobalSessionDuration(range),
  ]);

  const body: PublicDashboardResponse = {
    playersUnique,
    institutionsActive,
    turmasActive,
    annualGoalProgress: safeRate(playersUnique, EDITAL_ANNUAL_PLAYER_GOAL),
    completionRate,
    entryRate,
    phaseProgression,
    phaseDetail,
    originSplit,
    playerTrend,
    sessionDuration,
  };
  return NextResponse.json(body);
}
