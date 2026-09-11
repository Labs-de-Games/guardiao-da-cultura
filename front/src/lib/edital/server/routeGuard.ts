import "server-only";
import type { NextRequest } from "next/server";
import { auth } from "../../../auth";
import { parseDateRangeParams } from "../dateRangeSchema";
import type { ResolvedDateRange } from "./period";
import { resolveDateRange } from "./period";
import type { Scope } from "./scope";
import { resolveScope } from "./scope";

/**
 * Shared session/scope/date-range resolution for every /api/edital/*
 * data route (summary, funnel, report, report.csv, campaigns) — one
 * place to get the three checks right instead of five:
 *
 * 1. No session at all → 401 (issue #744's "sem sessão devolve 401").
 * 2. A session that resolves to no `Scope` (wrong role, or
 *    `institutionSlug: null`) → the caller renders the empty
 *    "awaiting linkage" state, with **zero** upstream PostHog calls
 *    (#744's acceptance criteria) — never a 401, since this is a real,
 *    authenticated institution account that simply isn't linked yet.
 * 3. Malformed `dateRange`/`from`/`to` → 400.
 *
 * `?slug=`/`?campaign=` are not read anywhere in this file, or anywhere
 * downstream — the surface simply has no such parameter (discovery
 * §5.4's "no value to override" tenancy argument).
 */
export type EditalRequestContext =
  | { kind: "unauthenticated" }
  | { kind: "unlinked" }
  | { kind: "invalid-params"; message: string }
  | { kind: "ok"; scope: Scope; range: ResolvedDateRange };

export async function resolveEditalRequestContext(
  request: NextRequest,
): Promise<EditalRequestContext> {
  const session = await auth();
  if (!session) {
    return { kind: "unauthenticated" };
  }

  const scope = resolveScope(session);
  if (!scope) {
    return { kind: "unlinked" };
  }

  try {
    const params = Object.fromEntries(request.nextUrl.searchParams);
    const dateRange = parseDateRangeParams(params);
    const range = resolveDateRange(dateRange);
    return { kind: "ok", scope, range };
  } catch (err) {
    return {
      kind: "invalid-params",
      message: err instanceof Error ? err.message : "Invalid query parameters",
    };
  }
}
