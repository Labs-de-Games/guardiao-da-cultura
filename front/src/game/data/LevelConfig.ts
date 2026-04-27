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
  PAINTINGS: [
    { key: "painting_01", path: "paintings/painting01.png" },
    { key: "painting_02", path: "paintings/painting02.png" },
    { key: "painting_03", path: "paintings/painting03.png" },
    { key: "painting_04", path: "paintings/painting04.png" },
    { key: "painting_05", path: "paintings/painting05.png" },
    { key: "painting_06", path: "paintings/painting06.png" },
    { key: "painting_07", path: "paintings/painting07.png" },
    { key: "painting_08", path: "paintings/painting08.png" },
    { key: "painting_09", path: "paintings/painting09.png" },
    { key: "painting_10", path: "paintings/painting10.png" },
    { key: "painting_11", path: "paintings/painting11.png" },
    { key: "painting_12", path: "paintings/painting12.png" },
    { key: "painting_13", path: "paintings/painting13.png" },
    { key: "painting_14", path: "paintings/painting14.png" },
    { key: "painting_15", path: "paintings/painting15.png" },
  ],
  CHUNKS: [
    { key: "C1", path: "pictures/chunk_1.png" },
    { key: "C2", path: "pictures/chunk_2.png" },
    { key: "C3", path: "pictures/chunk_3.png" },
    { key: "C4", path: "pictures/chunk_4.png" },
  ],
} as const;

export const PHASE_SETTINGS = {
  TITLE: "Museu antigo",
  MAX_STARS: 2,
  INITIAL_GRAYSCALE: 0.82,
} as const;
