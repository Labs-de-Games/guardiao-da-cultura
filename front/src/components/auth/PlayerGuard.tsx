"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/lib/auth/useAuth";
import { useFeatureFlag } from "@/lib/posthog/FeatureFlagContext";

const FLAG_TIMEOUT_MS = 5000;

interface PlayerGuardProps {
  children: ReactNode;
}

export default function PlayerGuard({ children }: PlayerGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const guestPlayFlag = useFeatureFlag("guest_play_enabled");
  const [flagTimedOut, setFlagTimedOut] = useState(false);
  const router = useRouter();

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

  useEffect(() => {
    if (!isLoading && !isFlagLoading) {
      if (!isAuthenticated && !guestPlayEnabled) {
        router.push("/login");
      } else if (
        isAuthenticated &&
        (user?.role === "institution" || user?.role === "admin")
      ) {
        router.push("/institution");
      }
    }
  }, [
    isAuthenticated,
    isLoading,
    isFlagLoading,
    user,
    guestPlayEnabled,
    router,
  ]);

  if (isLoading || isFlagLoading) {
    return <LoadingScreen />;
  }

  if (
    isAuthenticated &&
    (user?.role === "institution" || user?.role === "admin")
  ) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated && !guestPlayEnabled) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
