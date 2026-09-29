"use client";

import { Typography } from "@mui/material";
import posthog from "posthog-js";
import { useEffect } from "react";
import { FullPageMessage } from "@/components/FullPageMessage";

export default function RootError({
  error,
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
    <FullPageMessage
      imageSrc="/images/institution/porta-interditada.png"
      title="Não foi possível carregar as informações"
    >
      <Typography variant="body1" sx={{ color: "text.secondary" }}>
        Algo deu errado ao carregar esta página. Tente novamente em alguns
        instantes.
      </Typography>
    </FullPageMessage>
  );
}
