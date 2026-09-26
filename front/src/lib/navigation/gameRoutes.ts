export const GAME_ROUTE_PREFIX = "/game";
export const GAME_MAINTENANCE_PATH = `${GAME_ROUTE_PREFIX}/maintenance`;
export const PLAYER_LANDING_PATH = "/";

/** Landing and /game routes that use the game-styled error pages. */
export function isGameRoute(path: string): boolean {
  return (
    path === PLAYER_LANDING_PATH ||
    path === GAME_ROUTE_PREFIX ||
    path.startsWith(`${GAME_ROUTE_PREFIX}/`)
  );
}
