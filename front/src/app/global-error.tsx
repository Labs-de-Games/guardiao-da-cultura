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
