"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { DateRange } from "./types";

/**
 * Mirrors the date-range filter in the query string, so
 * `/institution?dateRange=custom&from=…&to=…` is shareable — issue
 * #745: "num artefato de edital, uma URL que reproduz exatamente o
 * número do print vale as 20 linhas." Requires the page to be wrapped in
 * `<Suspense>` (useSearchParams needs it), same as app/page.tsx and
 * app/game/page.tsx already do.
 */
export function useEditalFilters(): {
  dateRange: DateRange;
  setDateRange: (next: DateRange) => void;
} {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateRange = useMemo<DateRange>(() => {
    const type = searchParams.get("dateRange");
    if (type === "custom") {
      const start = searchParams.get("from") ?? "";
      const end = searchParams.get("to") ?? "";
      return { type: "custom", start, end };
    }
    if (type === "today" || type === "7d" || type === "all-time") {
      return { type };
    }
    return { type: "30d" };
  }, [searchParams]);

  const setDateRange = useCallback(
    (next: DateRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("dateRange", next.type);
      if (next.type === "custom") {
        params.set("from", next.start);
        params.set("to", next.end);
      } else {
        params.delete("from");
        params.delete("to");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return { dateRange, setDateRange };
}
