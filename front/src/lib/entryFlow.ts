export type EntryFlow = "map" | "direct";

export const DEFAULT_LEVEL_ID = "level_01";

export const entryFlowRoutes: Record<
  EntryFlow,
  {
    landingPath: string;
    gamePath: string;
  }
> = {
  map: {
    landingPath: "/play/map",
    gamePath: "/game/map",
  },
  direct: {
    landingPath: "/play/direct",
    gamePath: "/game/direct",
  },
};

export function getGamePath(entryFlow: EntryFlow): string {
  return entryFlowRoutes[entryFlow].gamePath;
}

export function getLandingPath(entryFlow: EntryFlow): string {
  return entryFlowRoutes[entryFlow].landingPath;
}

export function isDirectEntryFlow(entryFlow: EntryFlow): boolean {
  return entryFlow === "direct";
}
