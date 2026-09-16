"use client";

import { Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { FullPageMessage } from "@/components/FullPageMessage";

/**
 * Full-page takeover whenever the browser reports no network connection —
 * replaces the whole app (no nav, no page content) until connectivity
 * returns, then unmounts itself automatically (no retry button, matching
 * the reviewed design).
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (isOffline) {
    return (
      <FullPageMessage
        imageSrc="/images/institution/vaso-quebrado.png"
        title="Você está offline"
      >
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Não foi possível conectar à internet.
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Verifique sua conexão e tente novamente.
        </Typography>
      </FullPageMessage>
    );
  }

  return <>{children}</>;
}
