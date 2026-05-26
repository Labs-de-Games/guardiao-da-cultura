// ============================================================
//  LEVEL CONFIG
//  Central source of truth for phase settings and dynamic assets.
// ============================================================

export interface LevelDefinition {
  id: string;
  levelNumber: number;
  title: string;
  maxStars: number;
  initialGrayscale: number;
  map: {
    key: string;
    json: string;
    tileset: string;
    tilesetImg: string;
  };
  data: {
    works: string[];
    quizzes: string[];
    npcs: string[];
    messages: string[];
    collectibles: string[];
  };
}

export const LEVEL_REGISTRY: Record<string, LevelDefinition> = {
  level_01: {
    id: "level_01",
    levelNumber: 1,
    title: "Inhotim",
    maxStars: 2,
    initialGrayscale: 0.82,
    map: {
      key: "map",
      json: "maps/museum-mvp/map.json",
      tileset: "tiles",
      tilesetImg: "maps/museum-mvp/spritesheet.png",
    },
    data: {
      works: ["data/levels/level_01/works.json"],
      quizzes: ["data/levels/level_01/quizzes.json"],
      npcs: ["data/levels/level_01/npcs.json"],
      messages: ["data/global/messages.json"],
      collectibles: ["data/levels/level_01/collectibles.json"],
    },
  },
};

// Legacy support while refactoring
export const LEVEL_ASSETS = {
  MAP: LEVEL_REGISTRY.level_01.map,
  SCULPTURES: [
    {
      key: "edgards_sem_titulo_i_fundidos",
      path: "artworks/sculptures/edgards_sem_titulo_i_fundidos.png",
    },
    {
      key: "edgards_sem_titulo_i_fundidos_ph",
      path: "artworks/sculptures/edgards_sem_titulo_i_fundidos_ph.png",
    },
    {
      key: "edgards_sem_titulo_ii_flexao",
      path: "artworks/sculptures/edgards_sem_titulo_ii_flexao.png",
    },
    {
      key: "edgards_sem_titulo_ii_flexao_ph",
      path: "artworks/sculptures/edgards_sem_titulo_ii_flexao_ph.png",
    },
    {
      key: "edgards_sem_titulo_iii_em_pe",
      path: "artworks/sculptures/edgards_sem_titulo_iii_em_pe.png",
    },
    {
      key: "edgards_sem_titulo_iii_em_pe_ph",
      path: "artworks/sculptures/edgards_sem_titulo_iii_em_pe_ph.png",
    },
  ],
  PAINTINGS: [
    {
      key: "abdiasn_invocacao_noturna_oxossi",
      path: "artworks/paintings/abdiasn_invocacao_noturna_oxossi.png",
    },
    {
      key: "abdiasn_invocacao_noturna_oxossi_ph",
      path: "artworks/paintings/abdiasn_invocacao_noturna_oxossi_ph.png",
    },
    {
      key: "abdiasn_oke_oxossi",
      path: "artworks/paintings/abdiasn_oke_oxossi.png",
    },
    {
      key: "abdiasn_oke_oxossi_ph",
      path: "artworks/paintings/abdiasn_oke_oxossi_ph.png",
    },
    {
      key: "abdiasn_oxum_em_extase",
      path: "artworks/paintings/abdiasn_oxum_em_extase.png",
    },
    {
      key: "abdiasn_oxum_em_extase_ph",
      path: "artworks/paintings/abdiasn_oxum_em_extase_ph.png",
    },
    {
      key: "abdiasn_xango_rodrigues_alves",
      path: "artworks/paintings/abdiasn_xango_rodrigues_alves.png",
    },
    {
      key: "abdiasn_xango_rodrigues_alves_ph",
      path: "artworks/paintings/abdiasn_xango_rodrigues_alves_ph.png",
    },
  ],
  CHUNKS: [
    { key: "chunk_1-1", path: "artworks/photos/chunk-0.png" },
    { key: "chunk_1-2", path: "artworks/photos/chunk-1.png" },
    { key: "chunk_1-3", path: "artworks/photos/chunk-2.png" },
    { key: "chunk_1-4", path: "artworks/photos/chunk-3.png" },
    {
      key: "candujar_sem_titulo_yanomami",
      path: "artworks/photos/candujar_sem_titulo_yanomami.png",
    },
    {
      key: "candujar_sem_titulo_yanomami_ph",
      path: "artworks/photos/candujar_sem_titulo_yanomami_ph.png",
    },
  ],
  OTHERS: [
    { key: "exclamation", path: "misc/exclamation.png" },
    { key: "star", path: "misc/star.png" },
  ],
  COLLECTIBLES: [
    { key: "fusca", path: "collectibles/fusca.png" },
    { key: "abebe", path: "collectibles/abebe.png" },
    { key: "xotehe", path: "collectibles/xotehe.png" },
    { key: "cachimbo", path: "collectibles/cachimbo.png" },
    { key: "chimarrao", path: "collectibles/chimarrao.png" },
  ],
  CONTENT: {
    key: "content",
    path: "data/content.json",
  },
} as const;

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
