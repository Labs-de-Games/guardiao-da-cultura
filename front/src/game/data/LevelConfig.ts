// ============================================================
//  LEVEL CONFIG
//  Central source of truth for phase settings and dynamic assets.
// ============================================================

export interface LevelDefinition {
  id: string;
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
  };
}

export const LEVEL_REGISTRY: Record<string, LevelDefinition> = {
  level_01: {
    id: "level_01",
    title: "Museu Antigo",
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
    },
  },
};

// Legacy support while refactoring
export const LEVEL_ASSETS = {
  MAP: LEVEL_REGISTRY.level_01.map,
  SCULPTURES: [
    {
      key: "fundidos",
      path: "artworks/sculptures/edgards_sem_titulo_i_fundidos.png",
    },
    {
      key: "flexao",
      path: "artworks/sculptures/edgards_sem_titulo_ii_flexao.png",
    },
    {
      key: "em_pe",
      path: "artworks/sculptures/edgards_sem_titulo_iii_em_pe.png",
    },
  ],
  PAINTINGS: [
    {
      key: "painting_01",
      path: "artworks/paintings/abdiasn_invocacao_noturna_oxossi.png",
    },
    { key: "painting_02", path: "artworks/paintings/abdiasn_oke_oxossi.png" },
    {
      key: "painting_03",
      path: "artworks/paintings/abdiasn_oxum_em_extase.png",
    },
    {
      key: "painting_04",
      path: "artworks/paintings/abdiasn_xango_rodrigues_alves.png",
    },
  ],
  CHUNKS: [
    { key: "chunk_01", path: "artworks/photos/chunk-0.png" },
    { key: "chunk_02", path: "artworks/photos/chunk-1.png" },
    { key: "chunk_03", path: "artworks/photos/chunk-2.png" },
    { key: "chunk_04", path: "artworks/photos/chunk-3.png" },
  ],
  OTHERS: [
    { key: "exclamation", path: "misc/exclamation.png" },
    { key: "star", path: "misc/star.png" },
    { key: "inspect_example", path: "inspect_example.png" },
  ],
  CONTENT: {
    key: "content",
    path: "data/content.json",
  },
} as const;

export const PHASE_SETTINGS = {
  TITLE: LEVEL_REGISTRY.level_01.title,
  MAX_STARS: LEVEL_REGISTRY.level_01.maxStars,
  INITIAL_GRAYSCALE: LEVEL_REGISTRY.level_01.initialGrayscale,
} as const;
