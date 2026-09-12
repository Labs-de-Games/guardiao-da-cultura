"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
    // Issue #741's fourth critical_error_occurred hook: the root layout
    // itself crashed — the whole app is down, always blocking.
    posthog.capture("critical_error_occurred", {
      error_code: "react_error_boundary",
      is_blocking: true,
      boundary: "app/global-error.tsx",
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <h2>Algo deu errado!</h2>
        <button type="button" onClick={() => reset()}>
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
