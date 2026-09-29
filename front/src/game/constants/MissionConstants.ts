export const MissionIds = {
  CURATOR: "missao_curador",
  CURATOR_L2: "missao_curador_l2",
  CURATOR_L3: "missao_curador_l3",
} as const;

export const MissionKeys = {
  PAINTINGS_DONE: "paintings_done",
  SCULPTURES_DONE: "sculptures_done",
  PHOTO_COLLECTED: "photo_collected",
  PHOTO_DONE: "photo_done",
  COSTUMES_DONE: "costumes_done",
  POSTERS_DONE: "posters_done",
  SPOTLIGHTS_DONE: "spotlights_done",
  STAGE_DONE: "stage_done",
  DANCE_DONE: "dance_done",
  SWITCHES_DONE: "switches_done",
  GENIUS_DONE: "genius_done",
} as const;

export const NPC_FLOOR_3_POSITION = { x: 2100, y: 400 } as const;

export const FLOOR_COMPLETE_KEYS: Set<string> = new Set([
  MissionKeys.SCULPTURES_DONE,
  MissionKeys.PAINTINGS_DONE,
  MissionKeys.PHOTO_DONE,
  MissionKeys.COSTUMES_DONE,
  MissionKeys.POSTERS_DONE,
  MissionKeys.SPOTLIGHTS_DONE,
  MissionKeys.STAGE_DONE,
  MissionKeys.DANCE_DONE,
  MissionKeys.GENIUS_DONE,
]);

export const INTERMEDIATE_QUIZ_NUMBERS: Record<string, number> = {
  [MissionKeys.STAGE_DONE]: 1,
  [MissionKeys.PAINTINGS_DONE]: 2,
  [MissionKeys.PHOTO_DONE]: 3,
  [MissionKeys.COSTUMES_DONE]: 4,
  [MissionKeys.DANCE_DONE]: 5,
  [MissionKeys.GENIUS_DONE]: 6,
};

export type MissionId = (typeof MissionIds)[keyof typeof MissionIds];
export type MissionKey = (typeof MissionKeys)[keyof typeof MissionKeys];
