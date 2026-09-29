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

  // Allow-list rather than a block-list: a decision that has gone `"stale"`
  // has to hold the game back exactly like an absent one, and writing it this
  // way means a future state cannot leak through by being forgotten here.
  if (state !== "accepted" && state !== "declined") return null;

  return <>{children}</>;
}
