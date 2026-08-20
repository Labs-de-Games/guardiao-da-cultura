// ============================================================
//  NPC CONFIG
//  Central NPC configuration file.
// ============================================================

export const NPC_ASSETS = {
  IDLE_SPRITESHEET: {
    key: "npc_idle",
    path: "npcs/04_npc_female/idle.png",
    frameWidth: 48,
    frameHeight: 44,
  },
} as const;

export const NPC_ANIMS = {
  IDLE: {
    key: "npc_idle_anim",
    spritesheet: NPC_ASSETS.IDLE_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4],
    frameRate: 3,
    repeat: -1,
  },
} as const;

export const NPC_PHYSICS = {
  SCALE: 3.5,
  INTERACTION_GAP_Y: -70,
  EXCLAMATION_GAP_Y: -120,
} as const;
