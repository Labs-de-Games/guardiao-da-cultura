"use client";

import {
  DashboardRouteErrorPage,
  type DashboardRouteErrorPageProps,
} from "@/components/errors/DashboardErrorPages";
import { INSTITUTION_DASHBOARD_PATH } from "@/lib/navigation/dashboardRoutes";

type InstitutionErrorProps = Pick<
  DashboardRouteErrorPageProps,
  "error" | "reset"
>;

// Renders inside institution/layout.tsx, which already draws the footer.
export default function InstitutionError(props: InstitutionErrorProps) {
  return (
    <DashboardRouteErrorPage
      {...props}
      homeHref={INSTITUTION_DASHBOARD_PATH}
      withFooter={false}
    />
  );
}
