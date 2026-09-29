"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Shared across every edital dashboard page (issue #807) — turma is a
 * global filter like `useEditalFilters`'s date range, not a
 * page-specific concern, so it lives in `?turma=` the same way and is
 * shareable via URL for the same reason (#745's "a URL reproduz o
 * print"). Requires the page to be wrapped in `<Suspense>` (useSearchParams
 * needs it), same as every other edital page already is.
 */
export function useTurmaFilter(): {
  turma: string;
  setTurma: (next: string) => void;
} {
  const router = useRouter();
  const searchParams = useSearchParams();
  const turma = searchParams.get("turma") ?? "";

  const setTurma = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next) {
        params.set("turma", next);
      } else {
        params.delete("turma");
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return { turma, setTurma };
}
