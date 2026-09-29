"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useFeatureFlag } from "@/lib/posthog/FeatureFlagContext";

const FLAG_TIMEOUT_MS = 5000;

interface PlayerGuardProps {
  children: ReactNode;
}

/**
 * Players never authenticate (#738: no player login/registration, guest
 * play only) — this guard now only enforces the `guest_play_enabled` kill
 * switch. There is no player login page to redirect to if it's off, so we
 * simply keep blocking (LoadingScreen) rather than send guests to
 * /login, which is institution-only now.
 */
export default function PlayerGuard({ children }: PlayerGuardProps) {
  const guestPlayFlag = useFeatureFlag("guest_play_enabled");
  const [flagTimedOut, setFlagTimedOut] = useState(false);

  // If the flag never resolves (bootstrap failed or key absent), default to
  // allowing guest access after FLAG_TIMEOUT_MS so the app never hangs.
  useEffect(() => {
    if (guestPlayFlag !== undefined) return;
    const timer = setTimeout(() => setFlagTimedOut(true), FLAG_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [guestPlayFlag]);

  const isFlagLoading = guestPlayFlag === undefined && !flagTimedOut;
  // When timed out with no flag value, default to guest-allowed (open access).
  const guestPlayEnabled = guestPlayFlag === true || flagTimedOut;

  if (isFlagLoading || !guestPlayEnabled) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
