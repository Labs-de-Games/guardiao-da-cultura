import type { ReactNode } from "react";
import { ConsentGate } from "@/components/consent/ConsentGate";
import { OfflineNotice } from "@/components/errors/OfflineNotice";

/**
 * Covers `/` and `/game/*` — the player-facing surface. `/privacidade` sits
 * outside this group on purpose, so "Saiba mais" stays readable before the
 * player decides.
 */
export default function GameGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <OfflineNotice />
      {children}
      <ConsentGate />
    </>
  );
}
