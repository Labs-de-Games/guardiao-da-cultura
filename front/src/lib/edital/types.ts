/**
 * Client-safe types for the edital dashboard (epic #738). Nothing here
 * imports "server-only" or env-server — #745's client components can import
 * this module directly. Server internals (query builders, the Scope type,
 * HogQL client) live under lib/edital/server/ instead.
 */

/**
 * The date-range shapes #742's route handlers accept. `custom` carries
 * explicit bounds; the server clamps them (see server/period.ts) so an
 * unbounded custom range can't re-create the full-scan problem
 * EDITAL_PERIOD_START exists to prevent.
 */
export type DateRange =
  | { type: "today" }
  | { type: "7d" }
  | { type: "30d" }
  | { type: "90d" }
  | { type: "all-time" }
  | { type: "custom"; start: string; end: string };

/**
 * Every rate the dashboard shows is `{value, numerator, denominator}`, per
 * discovery §7's risk mitigation for "the number is not defensible to an
 * auditor" — never present an unqualified single number. `value` is always
 * in `[0, 1]`.
 */
export interface Rate {
  value: number;
  numerator: number;
  denominator: number;
}

/** Response shape of GET /api/edital/health. */
export interface EditalHealthResponse {
  configured: boolean;
}

/** One row of #807's per-phase breakdowns — always ordered by levelNumber. */
export interface PhaseRow {
  levelId: string;
  levelNumber: number;
  label: string;
}

export interface PhaseProgressRow extends PhaseRow {
  /** Unique players who entered this level (game_started). */
  reached: number;
  /** Unique players who finished this level (level_completed). */
  completed: number;
}

export interface PhaseQuizPassRateRow extends PhaseRow {
  rate: Rate;
}

export interface PhaseClueUsageRow extends PhaseRow {
  clueUses: number;
}

/**
 * `linked: false` on every response below means the caller's account has
 * no `institutionSlug` yet (or isn't an institution session at all) —
 * the route handler made zero upstream PostHog calls, per #744's
 * acceptance criteria. `data` is always `null` in that case; #745 must
 * render the "awaiting linkage" empty state, not mistake it for zero
 * players.
 *
 * `completionRate`/`phaseProgress`/`quizPassRate`/`clueUsage` (issue
 * #807) are institution-wide by default and turma-scoped whenever the
 * caller passes a valid `?turma=` — the same response shape either way,
 * so #745's Resumo Executivo screen doesn't need a second response type.
 */
export interface EditalSummaryResponse {
  linked: boolean;
  /** Unique-player count per canonical funnel event name. */
  data: Record<string, number> | null;
  completionRate?: Rate;
  /**
   * "Progresso médio" (issue #807's card list) — fraction of all levels
   * completed, averaged across players who started. `value` in [0,1];
   * `numerator`/`denominator` are level-completions, not players, so the
   * usual "never present an unqualified number" subtitle still applies.
   */
  averageProgress?: Rate;
  phaseProgress?: PhaseProgressRow[];
  quizPassRate?: PhaseQuizPassRateRow[];
  clueUsage?: PhaseClueUsageRow[];
}

export interface FunnelStepCount {
  label: string;
  value: number;
}

export interface EditalFunnelResponse {
  linked: boolean;
  /** Monotonically non-increasing, in canonical funnel order. */
  data: FunnelStepCount[] | null;
}

export interface EditalReportResponse {
  linked: boolean;
  data: {
    sessionDuration: {
      avgSeconds: number;
      medianSeconds: number;
      sessionsStarted: number;
    };
    quizPassRate: Rate;
    completionRate: Rate;
  } | null;
}

export interface CampaignOriginBreakdown {
  /** utm_source within the caller's own institution slug; "direto" if absent. */
  source: string;
  uniquePlayers: number;
}

export interface EditalCampaignsResponse {
  linked: boolean;
  /** Per-utm_source breakdown for the caller's own institution slug (issue #746). */
  data: CampaignOriginBreakdown[] | null;
}

/** A persisted campaign link — one group/class label under the caller's own institution slug. */
export interface CampaignLink {
  id: string;
  source: string;
  /** Full tracking URL, e.g. <origin>/?utm_institution=<slug>&utm_source=<source>, where <origin> is the current environment's domain */
  url: string;
  createdAt: string;
}

export interface EditalLinksListResponse {
  linked: boolean;
  data: CampaignLink[] | null;
}

export interface EditalLinksCreateResponse {
  linked: boolean;
  data: CampaignLink | null;
}
/**
 * Issue #808 — the public dashboard's response shape. Unlike every other
 * response in this file, there's no `linked` flag: this endpoint has no
 * session/institution to be linked or not, it's always cross-institution
 * aggregate data, always public.
 */
export interface PublicDashboardResponse {
  playersUnique: number;
  institutionsActive: number;
  turmasActive: number;
  /** Progress toward EDITAL_ANNUAL_PLAYER_GOAL — {value, numerator: playersUnique, denominator: 5000}. */
  annualGoalProgress: Rate;
  completionRate: Rate;
  entryRate: Rate;
  phaseProgression: Array<{ label: string; players: number }>;
  /** Per-level detail for the level-switcher panel — reached/completed counts plus quiz pass rate. */
  phaseDetail: Array<{
    levelId: string;
    levelNumber: number;
    label: string;
    reached: number;
    completed: number;
    quizPassRate: Rate;
  }>;
  originSplit: { institutional: number; spontaneous: number };
  playerTrend: Array<{ month: string; players: number }>;
  sessionDuration: {
    avgSeconds: number;
    medianSeconds: number;
    sessionsStarted: number;
  };
}
