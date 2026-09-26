import { DashboardNotFoundPage } from "@/components/errors/DashboardErrorPages";
import { PUBLIC_DASHBOARD_PATH } from "@/lib/navigation/dashboardRoutes";

export default function PublicDashboardNotFound() {
  return <DashboardNotFoundPage homeHref={PUBLIC_DASHBOARD_PATH} />;
}
