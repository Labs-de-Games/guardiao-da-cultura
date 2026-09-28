"use client";

import type { ReactNode } from "react";
import { useConsent } from "@/lib/consent/ConsentContext";

/**
 * Holds the game back until the player has answered the consent dialog
 * (issue #864), including on a direct hit to `/game`.
 *
 * Blocking input with the dialog's backdrop would not be enough on its own:
 * Phaser would still boot, start MapIntroScene and play its music behind a
 * question the player has not answered. Not mounting it is the honest version
 * of "must respond before continuing".
 *
 * Renders nothing while undecided rather than a loading screen — `ConsentGate`
 * already owns the whole viewport, and a spinner underneath would only show
 * through as noise.
 */
export function ConsentGuard({ children }: { children: ReactNode }) {
  const { state } = useConsent();

  if (state === "loading" || state === "undecided") return null;

  return <>{children}</>;
}
