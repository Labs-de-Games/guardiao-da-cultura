import "server-only";
import { isEditalPosthogConfigured, serverEnv } from "../../env-server";

/** Matches the nginx proxy read timeout assumption — see discovery §7. */
export const DEFAULT_HOGQL_TIMEOUT_MS = 25_000;

export class HogQLNotConfiguredError extends Error {
  constructor() {
    super("PostHog personal key/project id not configured");
    this.name = "HogQLNotConfiguredError";
  }
}

export class HogQLRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number | undefined) {
    super("PostHog Query API rate limited the request");
    this.name = "HogQLRateLimitError";
  }
}

export class HogQLRequestError extends Error {
  constructor(public readonly status: number) {
    // Deliberately generic — never interpolate the upstream response body
    // here. It could echo request details back (including, in principle,
    // anything sent), and this message is what ends up in logs and, if a
    // caller isn't careful, in a client-facing error. See discovery's
    // acceptance check: "key never in an error message."
    super(`PostHog Query API request failed with status ${status}`);
    this.name = "HogQLRequestError";
  }
}

export interface HogQLQueryResult {
  columns: string[];
  results: unknown[][];
}

export interface RunHogQLQueryOptions {
  timeoutMs?: number;
  /** Test-only hook to inject a fetch implementation. */
  fetchImpl?: typeof fetch;
}

/**
 * HogQL value bindings, e.g. `{ slug: "escola-teste", from_ts: "..." }`
 * for a query containing `{slug}` / `{from_ts}` placeholders. This is the
 * *only* channel for caller-supplied variability, per issue #742: "nunca
 * aceitar fragmento de SQL vindo do chamador — todas as queries são
 * constantes de compilação e toda variabilidade passa por values
 * bindados." `query` itself must always be a compile-time string literal
 * from queries.ts, never built by concatenating a caller value into SQL.
 */
export type HogQLValues = Record<string, string | number | boolean>;

/**
 * Raw HogQL Query API client. Scope enforcement (the branded `Scope` type)
 * happens one layer up, in the query builders that construct the `query`
 * string passed here — this function is deliberately scope-agnostic
 * transport, so it has nothing to get wrong about tenancy.
 *
 * `refresh: "blocking"` is what actually sustains load on the single
 * 0.5-cpu/512-M replica, per discovery §5.4 — paired with the module
 * cache + single-flight in metrics.ts.
 */
export async function runHogQLQuery(
  query: string,
  values: HogQLValues = {},
  options: RunHogQLQueryOptions = {},
): Promise<HogQLQueryResult> {
  if (!isEditalPosthogConfigured()) {
    throw new HogQLNotConfiguredError();
  }

  const {
    editalPosthogPersonalApiKey,
    editalPosthogProjectId,
    editalPosthogQueryHost,
  } = serverEnv.server;

  const url = `${editalPosthogQueryHost}/api/projects/${editalPosthogProjectId}/query/`;
  const doFetch = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? DEFAULT_HOGQL_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${editalPosthogPersonalApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query, values },
        refresh: "blocking",
      }),
      signal: controller.signal,
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      throw new HogQLRateLimitError(
        retryAfterHeader ? Number(retryAfterHeader) : undefined,
      );
    }

    if (!response.ok) {
      throw new HogQLRequestError(response.status);
    }

    const data = (await response.json()) as {
      columns?: string[];
      results?: unknown[][];
    };
    return { columns: data.columns ?? [], results: data.results ?? [] };
  } finally {
    clearTimeout(timeout);
  }
}
