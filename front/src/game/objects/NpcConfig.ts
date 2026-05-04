// ============================================================
//  NPC CONFIG
//  Central NPC configuration file.
// ============================================================

export const NPC_ASSETS = {
  IDLE_SPRITESHEET: {
    key: "npc_idle",
    path: "npcs/04_npc_female/idle.png",
    frameWidth: 48,
    frameHeight: 48,
  },
  GIVING_STAR_SPRITESHEET: {
    key: "npc_giving_star",
    path: "npcs/04_npc_female/idle.png", // Fallback pois o giving-star foi deletado
    frameWidth: 48,
    frameHeight: 48,
  },
} as const;

export const NPC_ANIMS = {
  IDLE: {
    key: "npc_idle_anim",
    spritesheet: NPC_ASSETS.IDLE_SPRITESHEET.key,
    frames: [0, 1, 2, 3],
    frameRate: 3,
    repeat: -1,
  },
  GIVING_STAR: {
    key: "npc_giving_star_anim", // Changed for clarity
    spritesheet: NPC_ASSETS.GIVING_STAR_SPRITESHEET.key,
    frames: { start: 0, end: 3 },
    frameRate: 9,
    repeat: 0,
  },
} as const;

export const NPC_PHYSICS = {
  SCALE: 4.5,
  INTERACTION_GAP_Y: -70,
  EXCLAMATION_GAP_Y: -120,
} as const;
