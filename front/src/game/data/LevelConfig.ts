// ============================================================
//  LEVEL CONFIG
//  Central source of truth for phase settings and dynamic assets.
// ============================================================

import { MAP_MARKERS } from "../constants/MapMarkers";

export interface LevelDefinition {
  id: string;
  levelNumber: number;
  title: string;
  maxStars: number;
  initialGrayscale: number;
  activeMissions: string[];
  map: {
    key: string;
    json: string;
    tileset: string;
    tilesetImg: string;
    tilesetName: string;
  };
  data: {
    works: string[];
    quizzes: string[];
    intermediateQuizzes: string[];
    npcs: string[];
    messages: string[];
    collectibles: string[];
  };
}

export const LEVEL_REGISTRY: Record<string, LevelDefinition> = {
  level_01: {
    id: "level_01",
    levelNumber: 1,
    title: MAP_MARKERS[0].title,
    maxStars: 2,
    initialGrayscale: 0.82,
    activeMissions: ["missao_curador"],
    map: {
      key: "map_level_01",
      json: "maps/inhotim/map.json",
      tileset: "tiles_level_01",
      tilesetImg: "maps/inhotim/spritesheet.png",
      tilesetName: "museum",
    },
    data: {
      works: ["data/levels/level_01/works.json"],
      quizzes: ["data/levels/level_01/quizzes.json"],
      intermediateQuizzes: ["data/levels/level_01/intermediate-quizzes.json"],
      npcs: ["data/levels/level_01/npcs.json"],
      messages: ["data/global/messages.json"],
      collectibles: ["data/levels/level_01/collectibles.json"],
    },
  },
  level_02: {
    id: "level_02",
    levelNumber: 2,
    title: MAP_MARKERS[1].title,
    maxStars: 2,
    initialGrayscale: 0.82,
    activeMissions: ["missao_curador_l2"],
    map: {
      key: "map_level_02",
      json: "maps/teatro-amazonas/map.json",
      tileset: "tiles_level_02",
      tilesetImg: "maps/teatro-amazonas/spritesheet.png",
      tilesetName: "teatro",
    },
    data: {
      works: ["data/levels/level_02/works.json"],
      quizzes: ["data/levels/level_02/quizzes.json"],
      intermediateQuizzes: ["data/levels/level_02/intermediate-quizzes.json"],
      npcs: ["data/levels/level_02/npcs.json"],
      messages: ["data/global/messages.json"],
      collectibles: ["data/levels/level_02/collectibles.json"],
    },
  },
  // Mock level: the map is playable but has no content or reachable objectives
  // yet. See docs/CHANGELOG.md.
  level_03: {
    id: "level_03",
    levelNumber: 3,
    title: MAP_MARKERS[2].title,
    maxStars: 2,
    initialGrayscale: 0.82,
    activeMissions: ["missao_curador_l3"],
    map: {
      key: "map_level_03",
      json: "maps/sao-joao-de-campina-grande/map.json",
      tileset: "tiles_level_03",
      tilesetImg: "maps/sao-joao-de-campina-grande/spritesheet.png",
      // Must match the tileset `name` inside that map.json.
      tilesetName: "museum",
    },
    data: {
      works: ["data/levels/level_03/works.json"],
      quizzes: ["data/levels/level_03/quizzes.json"],
      intermediateQuizzes: ["data/levels/level_03/intermediate-quizzes.json"],
      npcs: ["data/levels/level_03/npcs.json"],
      messages: ["data/global/messages.json"],
      collectibles: ["data/levels/level_03/collectibles.json"],
    },
  },
};

/** Level ids sorted by `levelNumber` — the canonical play order. */
export function getOrderedLevelIds(): string[] {
  return Object.values(LEVEL_REGISTRY)
    .sort((a, b) => a.levelNumber - b.levelNumber)
    .map((level) => level.id);
}

/**
 * The level that comes after `levelId`, or `undefined` when it is the last
 * one in the registry (or unknown).
 */
export function getNextLevelId(levelId: string): string | undefined {
  const ids = getOrderedLevelIds();
  const index = ids.indexOf(levelId);
  return index === -1 ? undefined : ids[index + 1];
}

export const LEVEL_ASSETS = {
  level_01: {
    MAP: LEVEL_REGISTRY.level_01.map,
    SCULPTURES: [
      {
        key: "edgards_sem_titulo_i_fundidos",
        path: "artworks/sculptures/edgards_sem_titulo_i_fundidos.png",
      },
      {
        key: "edgards_sem_titulo_ii_flexao",
        path: "artworks/sculptures/edgards_sem_titulo_ii_flexao.png",
      },
      {
        key: "edgards_sem_titulo_iii_em_pe",
        path: "artworks/sculptures/edgards_sem_titulo_iii_em_pe.png",
      },
      {
        key: "standard_sculpture_placeholder",
        path: "artworks/sculptures/standard_sculpture_placeholder.png",
      },
    ],
    PAINTINGS: [
      {
        key: "abdiasn_invocacao_noturna_oxossi",
        path: "artworks/paintings/abdiasn_invocacao_noturna_oxossi.png",
      },
      {
        key: "abdiasn_oke_oxossi",
        path: "artworks/paintings/abdiasn_oke_oxossi.png",
      },
      {
        key: "abdiasn_oxum_em_extase",
        path: "artworks/paintings/abdiasn_oxum_em_extase.png",
      },
      {
        key: "abdiasn_xango_rodrigues_alves",
        path: "artworks/paintings/abdiasn_xango_rodrigues_alves.png",
      },
      {
        key: "standard_painting_placeholder",
        path: "artworks/paintings/standard_painting_placeholder.png",
      },
    ],
    CHUNKS: [
      { key: "chunk_1-1", path: "artworks/photos/chunk-0.png" },
      { key: "chunk_1-2", path: "artworks/photos/chunk-1.png" },
      { key: "chunk_1-3", path: "artworks/photos/chunk-2.png" },
      { key: "chunk_1-4", path: "artworks/photos/chunk-3.png" },
    ],
    OTHERS: [
      { key: "rec", path: "misc/rec.png" },
      { key: "ladder_image", path: "misc/ladder.png" },
      { key: "light_bar", path: "misc/spotlights/light_bar.png" },
    ],
    COLLECTIBLES: [
      { key: "paper", path: "collectibles/paper.png" },
      { key: "varnish", path: "collectibles/varnish.png" },
    ],
    CONTENT: {
      key: "content",
      path: "data/content.json",
    },
  },
  level_02: {
    MAP: LEVEL_REGISTRY.level_02.map,
    SCULPTURES: [
      {
        key: "sam",
        path: "artworks/sculptures/sam.png",
      },
      {
        key: "soldado-caixa",
        path: "artworks/sculptures/soldado-caixa.png",
      },
    ],
    PAINTINGS: [
      {
        key: "ajuricaba",
        path: "artworks/posters/cartazes/ajuricaba.png",
      },
      {
        key: "anel-do-nibelungo",
        path: "artworks/posters/cartazes/anel-do-nibelungo.png",
      },
      {
        key: "opera-do-malandro",
        path: "artworks/posters/cartazes/opera-do-malandro.png",
      },
      {
        key: "zona-franca",
        path: "artworks/posters/cartazes/zona-franca.png",
      },
      {
        key: "zona-franca-framed",
        path: "artworks/posters/cartazes/zona-franca-framed.png",
      },
      {
        key: "opera-do-malandro-framed",
        path: "artworks/posters/cartazes/opera-do-malandro-framed.png",
      },
      {
        key: "ajuricaba-framed",
        path: "artworks/posters/cartazes/ajuricaba-framed.png",
      },
      {
        key: "anel-do-nibelungo-framed",
        path: "artworks/posters/cartazes/anel-do-nibelungo-framed.png",
      },
      {
        key: "frame-date-ajuricaba",
        path: "artworks/posters/cartazes/frame-date-ajuricaba.png",
      },
      {
        key: "frame-date-malandro",
        path: "artworks/posters/cartazes/frame-date-malandro.png",
      },
      {
        key: "frame-date-nibelungo",
        path: "artworks/posters/cartazes/frame-date-nibelungo.png",
      },
      {
        key: "frame-date-zona-franca",
        path: "artworks/posters/cartazes/frame-date-zona-franca.png",
      },
    ],
    CHUNKS: [],
    OTHERS: [
      {
        key: "p1",
        path: "moving-platforms/p1.png",
      },
      { key: "dummy_head", path: "artworks/costumes/dummy_head.png" },
      { key: "dummy_torso", path: "artworks/costumes/dummy_torso.png" },
      { key: "dummy_feet", path: "artworks/costumes/dummy_feet.png" },
      { key: "indian_head", path: "artworks/costumes/indian_head.png" },
      { key: "indian_torso", path: "artworks/costumes/indian_torso.png" },
      { key: "indian_feet", path: "artworks/costumes/indian_feet.png" },
      { key: "warrior_head", path: "artworks/costumes/warrior_head.png" },
      { key: "warrior_torso", path: "artworks/costumes/warrior_torso.png" },
      { key: "warrior_feet", path: "artworks/costumes/warrior_feet.png" },
      { key: "soldier_head", path: "artworks/costumes/soldier_head.png" },
      { key: "soldier_torso", path: "artworks/costumes/soldier_torso.png" },
      { key: "soldier_feet", path: "artworks/costumes/soldier_feet.png" },
      { key: "malandro_head", path: "artworks/costumes/malandro_head.png" },
      { key: "malandro_torso", path: "artworks/costumes/malandro_torso.png" },
      { key: "malandro_feet", path: "artworks/costumes/malandro_feet.png" },
      { key: "pedestal", path: "artworks/costumes/pedestal.png" },
      {
        key: "poster-label",
        path: "misc/poster-label.png",
      },
      {
        key: "stage-ph",
        path: "misc/stage-placeholder.png",
      },
      {
        key: "spotlight-off-red",
        path: "misc/spotlights/spotlight-off-red.png",
      },
      { key: "spotlight-red", path: "misc/spotlights/spotlight-red.png" },
      {
        key: "spotlight-off-green",
        path: "misc/spotlights/spotlight-off-green.png",
      },
      { key: "spotlight-green", path: "misc/spotlights/spotlight-green.png" },
      {
        key: "spotlight-off-blue",
        path: "misc/spotlights/spotlight-off-blue.png",
      },
      { key: "spotlight-blue", path: "misc/spotlights/spotlight-blue.png" },
      {
        key: "spotlight-off-yellow",
        path: "misc/spotlights/spotlight-off-yellow.png",
      },
      { key: "spotlight-yellow", path: "misc/spotlights/spotlight-yellow.png" },
      { key: "light_bar", path: "misc/spotlights/light_bar.png" },
    ],
    COLLECTIBLES: [
      { key: "document", path: "collectibles/document.png" },
      { key: "cachimbo", path: "collectibles/cachimbo.png" },
    ],
    CONTENT: {
      key: "content",
      path: "data/content.json",
    },
  },
  // Mock level: no artwork/collectibles of its own yet, only the tilemap
  // plus the LightBars/PlaceHolder layers.
  level_03: {
    MAP: LEVEL_REGISTRY.level_03.map,
    SCULPTURES: [],
    PAINTINGS: [],
    CHUNKS: [],
    OTHERS: [
      {
        key: "step_sequence_ph",
        path: "artworks/dance/sequence_step_placeholder.png",
      },
      {
        key: "light_bar",
        path: "misc/spotlights/light_bar.png",
      },
      {
        key: "switch_light",
        path: "misc/switch_light.png",
        frameWidth: 32,
        frameHeight: 20,
      },
      { key: "stage-band-ph", path: "misc/stage-band-placeholder.png" },
      { key: "wood_label", path: "misc/wood_label.png" },
      {
        key: "band_accordion",
        path: "band/animations/accordion.png",
        frameWidth: 68,
        frameHeight: 47,
      },
      {
        key: "band_jam_block",
        path: "band/animations/jam_block.png",
        frameWidth: 68,
        frameHeight: 47,
      },
      {
        key: "band_triangle",
        path: "band/animations/triangle.png",
        frameWidth: 68,
        frameHeight: 47,
      },
      {
        key: "band_zabumba",
        path: "band/animations/zabumba.png",
        frameWidth: 68,
        frameHeight: 46,
      },
      {
        key: "accordion_frame001",
        path: "artworks/accordion_animation/accordion_frame001.png",
      },
      {
        key: "accordion_frame002",
        path: "artworks/accordion_animation/accordion_frame002.png",
      },
      {
        key: "accordion_frame003",
        path: "artworks/accordion_animation/accordion_frame003.png",
      },
      {
        key: "accordion_frame004",
        path: "artworks/accordion_animation/accordion_frame004.png",
      },
      {
        key: "accordion_frame005",
        path: "artworks/accordion_animation/accordion_frame005.png",
      },
      {
        key: "accordion_frame006",
        path: "artworks/accordion_animation/accordion_frame006.png",
      },
      {
        key: "accordion_frame007",
        path: "artworks/accordion_animation/accordion_frame007.png",
      },
      {
        key: "accordion_frame008",
        path: "artworks/accordion_animation/accordion_frame008.png",
      },
      {
        key: "accordion_frame009",
        path: "artworks/accordion_animation/accordion_frame009.png",
      },
      {
        key: "note01",
        path: "misc/note01.png",
      },
      {
        key: "note02",
        path: "misc/note02.png",
      },
    ],
    // TODO(art): `itinerary` reuses the level_02 notes sprite as a placeholder.
    // Swap in dedicated artwork when available.
    COLLECTIBLES: [
      { key: "signature", path: "collectibles/signature.png" },
      { key: "itinerary", path: "collectibles/itinerary.png" },
    ],
    CONTENT: {
      key: "content",
      path: "data/content.json",
    },
  },
} as const;

export const GLOBAL_ASSETS = [
  { key: "exclamation", path: "misc/exclamation.png" },
  { key: "star", path: "misc/star.png", frameWidth: 32, frameHeight: 32 },
  { key: "interactive_hint_key", path: "misc/interactive_hint_key.png" },
] as const;

export const BADGE_ASSETS = [
  { key: "badge_explorer", path: "data/badges/badge_explorer.png" },
  { key: "badge_restorer", path: "data/badges/badge_restorer.png" },
  { key: "badge_curator", path: "data/badges/badge_curator.png" },
  { key: "badge_detective", path: "data/badges/badge_detective.png" },
  { key: "badge_persistent", path: "data/badges/badge_persistent.png" },
] as const;

export const PHASE_SETTINGS = {
  TITLE: LEVEL_REGISTRY.level_01.title,
  MAX_STARS: LEVEL_REGISTRY.level_01.maxStars,
  INITIAL_GRAYSCALE: LEVEL_REGISTRY.level_01.initialGrayscale,
} as const;
