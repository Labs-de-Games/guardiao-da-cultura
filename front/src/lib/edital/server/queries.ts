import "server-only";
import { serverEnv } from "../../env-server";

/**
 * Module-level cache + single-flight for query results, keyed by an
 * arbitrary string (a real caller keys by scope + query + date range).
 * This correctness does NOT depend on replica count — the compose files
 * confirm exactly one front replica today (discovery §5.4), but this
 * cache would still be correct-per-process if that ever changed; it just
 * wouldn't dedupe *across* processes. `refresh: "blocking"` in hogql.ts
 * is what actually keeps load sane either way.
 *
 * Real query builders (#742b) wrap `runHogQLQuery` calls in this; nothing
 * here is HogQL-specific, so it works for any async result.
 */
interface CacheEntry<T> {
  value?: T;
  expiresAt: number;
  inflight?: Promise<T>;
}

// biome-ignore lint/suspicious/noExplicitAny: a heterogeneous cache keyed
// by caller-chosen strings necessarily holds values of different types.
const cache = new Map<string, CacheEntry<any>>();

export interface WithCacheOptions {
  /** Defaults to serverEnv.server.editalQueryCacheTtlMs. */
  ttlMs?: number;
}

export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: WithCacheOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? serverEnv.server.editalQueryCacheTtlMs;
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing?.inflight) {
    // Single-flight: a second concurrent identical call joins the request
    // already in progress instead of issuing its own upstream call.
    return existing.inflight;
  }

  if (existing && existing.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  const inflight = fn()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((err) => {
      // Never cache a failure — the next call should retry, not replay
      // the same error for the rest of the TTL.
      cache.delete(key);
      throw err;
    });

  cache.set(key, { expiresAt: now, inflight });
  return inflight;
}

/** Test-only: clears the module-level cache between test cases. */
export function __resetQueryCacheForTests(): void {
  cache.clear();
}
