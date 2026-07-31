export const MissionIds = {
  CURATOR: "missao_curador",
  CURATOR_L2: "missao_curador_l2",
} as const;

export const MissionKeys = {
  PAINTINGS_DONE: "paintings_done",
  SCULPTURES_DONE: "sculptures_done",
  PHOTO_COLLECTED: "photo_collected",
  PHOTO_DONE: "photo_done",
  POSTERS_DONE: "posters_done",
} as const;

export const NPC_FLOOR_3_POSITION = { x: 2100, y: 400 } as const;

export const FLOOR_COMPLETE_KEYS: Set<string> = new Set([
  MissionKeys.SCULPTURES_DONE,
  MissionKeys.PAINTINGS_DONE,
  MissionKeys.PHOTO_DONE,
  MissionKeys.POSTERS_DONE,
]);

export const INTERMEDIATE_QUIZ_NUMBERS: Record<string, number> = {
  [MissionKeys.SCULPTURES_DONE]: 1,
  [MissionKeys.PAINTINGS_DONE]: 2,
  [MissionKeys.PHOTO_DONE]: 3,
};

export type MissionId = (typeof MissionIds)[keyof typeof MissionIds];
export type MissionKey = (typeof MissionKeys)[keyof typeof MissionKeys];
