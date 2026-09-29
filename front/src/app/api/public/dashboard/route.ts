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
import { HogQLNotConfiguredError } from "@/lib/edital/server/hogql";
import type { ResolvedDateRange } from "@/lib/edital/server/period";
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
  // Only the query-string parse is user input — a config error inside
  // resolveDateRange (it reads serverEnv) must be a 500, not a 400.
  let dateRange: ReturnType<typeof parseDateRangeParams>;
  try {
    dateRange = parseDateRangeParams(
      Object.fromEntries(request.nextUrl.searchParams),
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid query parameters";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const range = resolveDateRange(dateRange);

  try {
    return NextResponse.json(await buildPublicDashboard(range));
  } catch (err) {
    // Public, unauthenticated route: log the cause server-side, never echo
    // err.message to the client.
    console.error("[public-dashboard] failed to load metrics", err);
    if (err instanceof HogQLNotConfiguredError) {
      return NextResponse.json(
        { error: "Dashboard indisponível" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 502 },
    );
  }
}

async function buildPublicDashboard(
  range: ResolvedDateRange,
): Promise<PublicDashboardResponse> {
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

  return {
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
}
