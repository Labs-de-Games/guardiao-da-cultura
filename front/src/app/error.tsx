"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
    // Issue #741's fourth critical_error_occurred hook: a route-segment
    // error boundary means the player is stuck on this screen — blocking.
    posthog.capture("critical_error_occurred", {
      error_code: "react_error_boundary",
      is_blocking: true,
      boundary: "app/error.tsx",
    });
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "1rem",
      }}
    >
      <h2>Algo deu errado!</h2>
      <button type="button" onClick={() => reset()}>
        Tentar novamente
      </button>
    </div>
  );
}
