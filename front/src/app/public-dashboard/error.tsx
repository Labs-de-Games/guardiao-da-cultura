"use client";

import {
  DashboardRouteErrorPage,
  type DashboardRouteErrorPageProps,
} from "@/components/errors/DashboardErrorPages";
import { PUBLIC_DASHBOARD_PATH } from "@/lib/navigation/dashboardRoutes";

type PublicDashboardErrorProps = Pick<
  DashboardRouteErrorPageProps,
  "error" | "reset"
>;

// No layout here — the footer lives in page.tsx, which this replaces.
export default function PublicDashboardError(props: PublicDashboardErrorProps) {
  return (
    <DashboardRouteErrorPage {...props} homeHref={PUBLIC_DASHBOARD_PATH} />
  );
}
