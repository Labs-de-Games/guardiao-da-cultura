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
  SCULPTURES: [
    { key: "sprite_01", path: "sculptures/sprite_01.png" },
    { key: "sprite_02", path: "sculptures/sprite_02.png" },
    { key: "sprite_03", path: "sculptures/sprite_03.png" },
    { key: "sprite_04", path: "sculptures/sprite_04.png" },
    { key: "sprite_05", path: "sculptures/sprite_05.png" },
    { key: "sprite_06", path: "sculptures/sprite_06.png" },
    { key: "sprite_07", path: "sculptures/sprite_07.png" },
    { key: "sprite_08", path: "sculptures/sprite_08.png" },
    { key: "sprite_09", path: "sculptures/sprite_09.png" },
    { key: "sprite_10", path: "sculptures/sprite_10.png" },
    { key: "sprite_11", path: "sculptures/sprite_11.png" },
    { key: "sprite_12", path: "sculptures/sprite_12.png" },
    { key: "sprite_13", path: "sculptures/sprite_13.png" },
    { key: "sprite_14", path: "sculptures/sprite_14.png" },
  ],
  PICTURES: [
    { key: "painting_01", path: "pictures/painting01.png" },
    { key: "painting_02", path: "pictures/painting02.png" },
    { key: "painting_03", path: "pictures/painting03.png" },
    { key: "painting_04", path: "pictures/painting04.png" },
    { key: "painting_05", path: "pictures/painting05.png" },
    { key: "painting_06", path: "pictures/painting06.png" },
    { key: "painting_07", path: "pictures/painting07.png" },
    { key: "painting_08", path: "pictures/painting08.png" },
    { key: "painting_09", path: "pictures/painting09.png" },
    { key: "painting_10", path: "pictures/painting10.png" },
    { key: "painting_11", path: "pictures/painting11.png" },
    { key: "painting_12", path: "pictures/painting12.png" },
    { key: "painting_13", path: "pictures/painting13.png" },
    { key: "painting_14", path: "pictures/painting14.png" },
    { key: "painting_15", path: "pictures/painting15.png" },
  ],
} as const;

export const PHASE_SETTINGS = {
  TITLE: "Museu antigo",
  MAX_STARS: 2,
  INITIAL_GRAYSCALE: 0.82,
} as const;
