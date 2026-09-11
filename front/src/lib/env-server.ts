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
   * The Query API's app host (e.g. https://us.posthog.com) — distinct from
   * the ingestion host (NEXT_PUBLIC_POSTHOG_HOST, e.g. us.i.posthog.com)
   * already used for capture.
   */
  editalPosthogAppHost: z.string().url().default("https://us.posthog.com"),
  /**
   * Module-cache TTL for query results. Default is discovery's placeholder
   * (5 minutes), explicitly pending #739(b)'s rate-limit answer.
   */
  editalQueryCacheTtlMs: z.coerce.number().int().positive().default(300000),
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;

function getServerEnv() {
  if (!_serverEnv) {
    _serverEnv = serverSchema.parse({
      responsivevoiceApiKey: process.env.RESPONSIVEVOICE_API_KEY,
      responsivevoiceApiUrl: process.env.RESPONSIVEVOICE_API_URL,
      editalPosthogPersonalApiKey: process.env.POSTHOG_PERSONAL_API_KEY,
      editalPosthogProjectId: process.env.POSTHOG_PROJECT_ID,
      editalPosthogAppHost: process.env.POSTHOG_APP_HOST,
      editalQueryCacheTtlMs: process.env.EDITAL_QUERY_CACHE_TTL_MS,
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
