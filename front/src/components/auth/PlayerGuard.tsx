"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import LoadingScreen from "@/components/LoadingScreen";
import { useAuth } from "@/lib/auth/useAuth";

interface PlayerGuardProps {
  children: ReactNode;
}

export default function PlayerGuard({ children }: PlayerGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role === "institution" || user?.role === "admin") {
        router.push("/institution");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (
    !isAuthenticated ||
    user?.role === "institution" ||
    user?.role === "admin"
  ) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
