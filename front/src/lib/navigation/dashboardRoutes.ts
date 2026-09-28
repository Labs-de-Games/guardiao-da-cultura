import { PLAYER_LANDING_PATH } from "./gameRoutes";

export const INSTITUTION_DASHBOARD_PATH = "/institution";
export const PUBLIC_DASHBOARD_PATH = "/public-dashboard";
export const LOGIN_PATH = "/login";

const DASHBOARD_PATHS = [INSTITUTION_DASHBOARD_PATH, PUBLIC_DASHBOARD_PATH];

export interface HomeLink {
  href: string;
  label: string;
}

function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Where a 404 should send the user back to, based on the URL they tried. */
export function homeLinkFor(path: string): HomeLink {
  const dashboard = DASHBOARD_PATHS.find((prefix) => isUnder(path, prefix));
  if (dashboard) return { href: dashboard, label: "Voltar ao painel" };
  return { href: PLAYER_LANDING_PATH, label: "Voltar ao início" };
}
