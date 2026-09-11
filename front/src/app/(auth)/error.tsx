"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
    // Issue #741's fourth critical_error_occurred hook: an error here is
    // on the auth flow, not inside gameplay — not blocking the edital's
    // chapter_1_completed funnel by itself.
    posthog.capture("critical_error_occurred", {
      error_code: "react_error_boundary",
      is_blocking: false,
      boundary: "app/(auth)/error.tsx",
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
