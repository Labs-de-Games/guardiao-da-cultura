export const MissionIds = {
  CURATOR: "missao_curador",
} as const;

export const MissionKeys = {
  PAINTINGS_DONE: "paintings_done",
  SCULPTURES_DONE: "sculptures_done",
  PHOTO_COLLECTED: "photo_collected",
  PHOTO_DONE: "photo_done",
} as const;

export type MissionId = (typeof MissionIds)[keyof typeof MissionIds];
export type MissionKey = (typeof MissionKeys)[keyof typeof MissionKeys];
