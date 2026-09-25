import "server-only";
import { z } from "zod";
import { env } from "./env";

const serverSchema = z
  .object({
    responsivevoiceApiKey: z.string().min(1),
    responsivevoiceApiUrl: z
      .string()
      .url()
      .default("https://texttospeech.responsivevoice.org/v1/text:synthesize"),

    // --- Edital dashboard (epic #738) — all four optional, so the app boots
    // unconfigured and /api/edital/health reports configured:false.
    /** Personal `phx_` PostHog key — Query API, never NEXT_PUBLIC_*. */
    editalPosthogPersonalApiKey: z.string().optional(),
    editalPosthogProjectId: z.string().optional(),
    /**
     * The Query API's host (e.g. https://us.posthog.com) — distinct from
     * POSTHOG_HOST, which points at the *ingestion* host (us.i.posthog.com)
     * and does not serve /api/projects/*. Named POSTHOG_QUERY_HOST per
     * issue #742, not POSTHOG_APP_HOST.
     */
    editalPosthogQueryHost: z.string().url().default("https://us.posthog.com"),
    /**
     * Module-cache TTL for query results. Default is issue #742's own
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

    /**
     * Server-to-server backend URL — deliberately separate from
     * NEXT_PUBLIC_API_URL. That variable is baked for the *browser*
     * (e.g. http://localhost:3001, reachable from the host machine); this
     * one is for calls made from Next.js server-side code (auth.ts's
     * signIn/authorize callbacks), which run inside the front container
     * and need the Docker Compose service name (http://back:3001) instead
     * — "localhost" inside that container means the front container
     * itself, not the back one. Falls back to NEXT_PUBLIC_API_URL so
     * bare `npm run dev` (front and back both genuinely on localhost, no
     * Docker) keeps working without this var set.
     */
    backendInternalUrl: z.string().url().optional(),

    /**
     * NextAuth.js's own env vars (epic #738, #744) — NextAuth reads these
     * from process.env by its own convention, not through this schema.
     * Declared here purely so a missing/misconfigured value fails app boot
     * in staging/production instead of silently disabling Google login (the
     * signIn callback would otherwise just reject every Google sign-in with
     * no startup-time signal). Optional in development, where Google login
     * may be intentionally unconfigured.
     */
    authSecret: z.string().optional(),
    authGoogleId: z.string().optional(),
    authGoogleSecret: z.string().optional(),

    /**
     * Required behind the nginx reverse proxy so NextAuth trusts the
     * X-Forwarded-Proto/Host headers instead of inferring the wrong origin.
     * NextAuth reads this from process.env by its own convention, same as
     * the three vars above; declared here purely for the boot-time guard.
     */
    authTrustHost: z.string().optional(),
  })
  .refine(
    (data) => env.client.env === "development" || Boolean(data.authSecret),
    {
      message: "AUTH_SECRET is required outside development",
      path: ["authSecret"],
    },
  )
  .refine(
    (data) => env.client.env === "development" || Boolean(data.authGoogleId),
    {
      message: "AUTH_GOOGLE_ID is required outside development",
      path: ["authGoogleId"],
    },
  )
  .refine(
    (data) =>
      env.client.env === "development" || Boolean(data.authGoogleSecret),
    {
      message: "AUTH_GOOGLE_SECRET is required outside development",
      path: ["authGoogleSecret"],
    },
  )
  .refine(
    (data) => env.client.env === "development" || Boolean(data.authTrustHost),
    {
      message: "AUTH_TRUST_HOST is required outside development",
      path: ["authTrustHost"],
    },
  );

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
      backendInternalUrl: process.env.BACKEND_INTERNAL_URL,
      authSecret: process.env.AUTH_SECRET,
      authGoogleId: process.env.AUTH_GOOGLE_ID,
      authGoogleSecret: process.env.AUTH_GOOGLE_SECRET,
      authTrustHost: process.env.AUTH_TRUST_HOST,
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
