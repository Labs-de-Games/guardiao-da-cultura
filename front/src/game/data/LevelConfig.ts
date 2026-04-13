// ============================================================
//  LEVEL CONFIG
//  Central source of truth for phase settings and dynamic assets.
// ============================================================

export const LEVEL_ASSETS = {
  MAP: {
    key: "map",
    json: "map_v0/map.json",
    tileset: "tiles",
    tilesetImg: "map_v0/spritesheet.png",
  },
  RELICS: [
    { key: "relic_statue", path: "relics/statue_relic.png" },
    { key: "relic_painting", path: "relics/painting_relic.png" },
    { key: "relic_sarcophagus", path: "relics/sarcophagus_relic.png" },
    { key: "relic_fossil", path: "relics/dino_relic.png" },
  ],
  OTHERS: [
    { key: "exclamation", path: "exclamation.png" },
    { key: "star", path: "star.png" },
    { key: "inspect_example", path: "inspect_example.png" },
  ],
} as const;

export const PHASE_SETTINGS = {
  TITLE: "Museu antigo",
  MAX_STARS: 2,
  INITIAL_GRAYSCALE: 0.82,
} as const;
