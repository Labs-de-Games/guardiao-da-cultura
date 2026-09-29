"use client";

import { usePathname } from "next/navigation";
import { DashboardNotFoundPage } from "@/components/errors/DashboardErrorPages";
import { homeLinkFor } from "@/lib/navigation/dashboardRoutes";

/**
 * Site-wide 404, dashboard design. Also serves unknown /institution/* URLs,
 * so they show full-page instead of inside the sidebar layout; the button
 * still leads back to the right dashboard.
 */
export default function NotFound() {
  const { href, label } = homeLinkFor(usePathname() ?? "");
  return <DashboardNotFoundPage homeHref={href} homeLabel={label} />;
}
