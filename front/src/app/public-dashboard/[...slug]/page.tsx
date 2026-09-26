import { notFound } from "next/navigation";

/** Unknown /public-dashboard/* URLs get the dashboard 404, not the site-wide one. */
export default function PublicDashboardCatchAll() {
  notFound();
}
