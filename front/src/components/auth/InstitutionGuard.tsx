"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { DashboardLoadingScreen } from "@/components/dashboard/DashboardLoadingScreen";
import { DashboardSessionExpiredPage } from "@/components/errors/DashboardErrorPages";

interface InstitutionGuardProps {
  children: ReactNode;
}

/**
 * Reads the NextAuth session, not the legacy AuthContext — issue #744's
 * "Coexistência" section is explicit that this guard is replaced for the
 * institution role, while admin stays on the legacy path. Client-side
 * redirect here is a UX nicety only; middleware.ts already enforces the
 * real gate (a signed session cookie with role "institution") before this
 * component's JS ever runs.
 *
 * A session that ends while the dashboard is open (expired, revoked in
 * another tab) shows the session-expired screen with a login link instead
 * of silently bouncing to /login, so the user knows why they left.
 */
export default function InstitutionGuard({ children }: InstitutionGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isLoading = status === "loading";
  const isAuthorized = session?.user?.role === "institution";

  useEffect(() => {
    if (isLoading) return;
    if (status === "authenticated" && !isAuthorized) {
      router.push("/");
    }
  }, [isLoading, status, isAuthorized, router]);

  if (status === "unauthenticated") {
    // Rendered outside institution/layout.tsx's chrome, so it brings its
    // own footer.
    return <DashboardSessionExpiredPage />;
  }

  if (isLoading || !isAuthorized) {
    return <DashboardLoadingScreen />;
  }

  return <>{children}</>;
}
