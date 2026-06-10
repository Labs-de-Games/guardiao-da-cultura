"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/lib/auth/useAuth";
import { useFeatureFlag } from "@/lib/posthog/FeatureFlagContext";

interface PlayerGuardProps {
  children: ReactNode;
}

export default function PlayerGuard({ children }: PlayerGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const guestPlayFlag = useFeatureFlag("guest_play_enabled");
  const guestPlayEnabled = guestPlayFlag === true;
  const isFlagLoading = guestPlayFlag === undefined;
  const router = useRouter();

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
