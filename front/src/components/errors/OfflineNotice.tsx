"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

const OFFLINE_MESSAGE =
  "Sem conexão com a internet. O jogo continua quando a conexão voltar.";
const ONLINE_MESSAGE = "Conexão restabelecida.";

/** Tells players when their own connection drops, instead of an outage page. */
export function OfflineNotice() {
  const { showToast } = useToast();

  useEffect(() => {
    const handleOffline = () => showToast(OFFLINE_MESSAGE, "warning");
    const handleOnline = () => showToast(ONLINE_MESSAGE, "success");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [showToast]);

  return null;
}
