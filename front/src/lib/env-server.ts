import "server-only";
import { z } from "zod";
import { env } from "./env";

const serverSchema = z.object({
  responsivevoiceApiKey: z.string().min(1),
  responsivevoiceApiUrl: z
    .string()
    .url()
    .default("https://texttospeech.responsivevoice.org/v1/text:synthesize"),

  // --- Edital dashboard (epic #738) — all four optional, so the app boots
  // unconfigured and /api/edital/health reports configured:false. See
  // docs/specs/discovery-738-dashboard-edital.md §5.4.
  /** Personal `phx_` PostHog key — Query API, never NEXT_PUBLIC_*. */
  editalPosthogPersonalApiKey: z.string().optional(),
  editalPosthogProjectId: z.string().optional(),
  /**
   * The Query API's host (e.g. https://us.posthog.com) — distinct from
   * POSTHOG_HOST, the *ingestion* host (e.g. us.i.posthog.com) already
   * used for capture, which does not serve /api/projects/*. Named
   * POSTHOG_QUERY_HOST per issue #742, not POSTHOG_APP_HOST.
   */
  editalPosthogQueryHost: z.string().url().default("https://us.posthog.com"),
  /**
   * Module-cache TTL for query results. Default is discovery's/issue #742's
   * stated default (5 minutes), explicitly pending #739(b)'s rate-limit
   * answer. Named POSTHOG_QUERY_CACHE_TTL_MS per that issue, not
   * EDITAL_QUERY_CACHE_TTL_MS.
   */
  editalQueryCacheTtlMs: z.coerce.number().int().positive().default(300000),
  /**
   * The reportable window's start — an ISO date string (e.g.
   * "2026-04-01"), set once #740's actual deploy date is known (see
   * implementation-plan step 5). Config, not a code constant: the date
   * can only be known after #740 ships, and ops setting an env var on
   * deploy day is safer than a PR racing to hardcode a guess. Unset
   * means "no clamp yet" — the only honest value before that day.
   */
  editalPeriodStart: z.coerce.date().optional(),

  /**
   * Shared secret for POST /auth/oauth/upsert (epic #738, #744) — sent as
   * the x-oauth-upsert-token header from auth.ts's signIn callback.
   * Optional so the app boots without it; signIn refuses institution
   * sign-in when unset rather than calling the backend with no token.
   */
  authOauthUpsertToken: z.string().optional(),
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;

function getServerEnv() {
  if (!_serverEnv) {
    _serverEnv = serverSchema.parse({
      responsivevoiceApiKey: process.env.RESPONSIVEVOICE_API_KEY,
      responsivevoiceApiUrl: process.env.RESPONSIVEVOICE_API_URL,
      editalPosthogPersonalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
      editalPosthogProjectId: process.env.POSTHOG_PROJECT_ID,
      editalPosthogQueryHost: process.env.POSTHOG_QUERY_HOST,
      editalQueryCacheTtlMs: process.env.POSTHOG_QUERY_CACHE_TTL_MS,
      editalPeriodStart: process.env.EDITAL_PERIOD_START,
      authOauthUpsertToken: process.env.AUTH_OAUTH_UPSERT_TOKEN,
    });
  }
  return _serverEnv;
}

export function resetServerEnv(): void {
  _serverEnv = null;
}

export const serverEnv = {
  ...env,
  get server() {
    return getServerEnv();
  },
};

/** True once all three edital PostHog fields are set — no partial config. */
export function isEditalPosthogConfigured(): boolean {
  const s = getServerEnv();
  return Boolean(s.editalPosthogPersonalApiKey && s.editalPosthogProjectId);
}
