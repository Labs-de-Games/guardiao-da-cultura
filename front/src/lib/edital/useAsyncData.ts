import { useCallback, useEffect, useState } from "react";

interface AsyncDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Encapsulates the `let cancelled = false` pattern already used in
 * institution/page.tsx (pre-rewrite) — issue #745's own instruction, no
 * react-query, no SWR, keeping the repo's existing convention. `retry`
 * clears the error and re-runs `fetcher`; the real bug this fixes (not
 * cosmetic) is that the old page's error state unmounted FilterBar on
 * any transient failure — callers of this hook keep their own UI
 * mounted through an error and just re-render with `error` set.
 */
export function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  enabled = true,
): AsyncDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro desconhecido");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retryToken, enabled]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  return { data, loading, error, retry };
}
