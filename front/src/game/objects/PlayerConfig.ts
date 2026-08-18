// ============================================================
//  PLAYER CONFIG
//  Central Player configuration file.
//  All macros/constants used to instantiate and
//  control the Player object must be defined here.
// ============================================================

// ------------------------------------------------------------
// ASSETS
// ------------------------------------------------------------
export const PLAYER_ASSETS = {
  WALK_SPRITESHEET: {
    key: "player_walk",
    path: "player/animations/walking.png",
    // frameWidth: 48,
    // frameHeight: 37,
    frameWidth: 64,
    frameHeight: 44,
  },
  IDLE_SPRITESHEET: {
    key: "player_idle",
    path: "player/animations/idle.png",
    frameWidth: 64,
    frameHeight: 45,
  },
  JUMP_SPRITESHEET: {
    key: "player_jump",
    path: "player/animations/jump.png",
    frameWidth: 64,
    frameHeight: 48,
  },
  CLIMB_SPRITESHEET: {
    key: "player_climb",
    path: "player/animations/climbing_up.png",
    frameWidth: 48,
    frameHeight: 48,
  },
  CLIMB_DOWN_SPRITESHEET: {
    key: "player_climb_down",
    path: "player/animations/climbing_up.png",
    frameWidth: 48,
    frameHeight: 48,
  },
  DRAGGING_SPRITESHEET: {
    key: "player_dragging",
    path: "player/animations/dragging.png",
    frameWidth: 64,
    frameHeight: 42,
  },
  CARRYING_SPRITESHEET: {
    key: "player_carrying",
    path: "player/animations/carrying.png",
    frameWidth: 48,
    frameHeight: 37,
  },
  BACK_SPRITESHEET: {
    key: "player_back",
    path: "player/animations/back.png",
    frameWidth: 48,
    frameHeight: 37,
  },
  BACK_CARRYING_SPRITESHEET: {
    key: "player_back_carrying",
    path: "player/animations/back-carrying.png",
    frameWidth: 48,
    frameHeight: 37,
  },
  FRONT_SPRITESHEET: {
    key: "player_front",
    path: "player/animations/front.png",
    frameWidth: 48,
    frameHeight: 37,
  },
  FRONT_CARRYING_SPRITESHEET: {
    key: "player_front_carrying",
    path: "player/animations/front-carrying.png",
    frameWidth: 48,
    frameHeight: 37,
  },
  SOUNDS: {},
} as const;

// ------------------------------------------------------------
// SPAWN / INITIAL POSITION
// ------------------------------------------------------------
export const PLAYER_SPAWN = {
  X: 300,
  Y: 400, // Adjusted for a more reasonable starting Y in museum scenes
  TEXTURE: PLAYER_ASSETS.WALK_SPRITESHEET.key, // texture used in the constructor
} as const;

// ------------------------------------------------------------
// STATS
// ------------------------------------------------------------
export const PLAYER_STATS = {
  HP: 3,
  INITIAL_COINS: 0,
} as const;

// ------------------------------------------------------------
// PHYSICS
// ------------------------------------------------------------
export const PLAYER_PHYSICS = {
  SCALE: 3.5,

  /**
   * Hitbox size (setSize) for the default (walk/idle/carry/back/front)
   * states. Its offset is derived dynamically from the active frame's
   * dimensions in Player.setPhysicsBodyForVisualScale — centered
   * horizontally, foot-anchored vertically — since those spritesheets
   * don't all share the same frame size.
   */
  HITBOX: {
    WIDTH: 12,
    HEIGHT: 38,
  },

  DAMPING: true,
  DRAG: { Y: 1, X: 0.0001 },

  GRAVITY: {
    X: 0,
    Y: 4500,
  },

  MAX_VELOCITY: {
    X: 3000,
    Y: 1300,
  },
} as const;

// ------------------------------------------------------------
// MOVEMENT
// ------------------------------------------------------------
export const PLAYER_MOVEMENT = {
  /** Normal horizontal acceleration */
  WALK_ACCELERATION: 90,

  /** Vertical jump velocity */
  JUMP_VELOCITY_Y: -1270,

  /** Vertical speed when climbing ladders */
  CLIMB_SPEED_Y: 600,

  /** Acceleration when pushing/pulling items */
  PUSH_ACCELERATION: 30,

  /** Maximum distance to grab an item */
  GRAB_DISTANCE: 80,
} as const;

// ------------------------------------------------------------
// DAMAGE / KNOCKBACK
// ------------------------------------------------------------
export const PLAYER_DAMAGE = {
  /** Hit-stun duration in ms */
  HIT_STUN_DURATION_MS: 400,

  /** Vertical knockback velocity */
  KNOCKBACK_VELOCITY_Y: -1700,

  /** Horizontal knockback multiplier (× dirX) */
  KNOCKBACK_VELOCITY_X: 1500,

  /** Flash color on taking damage (red) */
  HIT_TINT: 0xff0000,
} as const;

// ------------------------------------------------------------
// ANIMATIONS
// ------------------------------------------------------------
export const PLAYER_ANIMS = {
  IDLE: {
    key: "idle",
    spritesheet: PLAYER_ASSETS.IDLE_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 7,
    repeat: -1,
  },
  WALK: {
    key: "walk",
    spritesheet: PLAYER_ASSETS.WALK_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 15,
    repeat: -1,
  },
  CARRY_IDLE: {
    key: "carry_idle",
    spritesheet: PLAYER_ASSETS.CARRYING_SPRITESHEET.key,
    frames: [0],
    frameRate: 10,
    repeat: -1,
  },
  CARRY_WALK: {
    key: "carry_walk",
    spritesheet: PLAYER_ASSETS.CARRYING_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 15,
    repeat: -1,
  },
  JUMP: {
    key: "jump",
    spritesheet: PLAYER_ASSETS.JUMP_SPRITESHEET.key,
    frames: [1, 2, 3, 4, 5, 6, 7, 8],
    frameRate: 17,
    repeat: 0,
  },

  CLIMB: {
    key: "climb",
    spritesheet: "player_climb",
    frames: [0, 1, 2, 3, 4],
    frameRate: 5,
    repeat: -1,
  },
  CLIMB_DOWN: {
    key: "climb_down",
    spritesheet: "player_climb",
    frames: [4, 3, 2, 1, 0],
    frameRate: 5,
    repeat: -1,
  },
  BACK: {
    key: "back",
    spritesheet: "player_back",
    frames: [0],
    frameRate: 5,
    repeat: -1,
  },
  BACK_CARRYING: {
    key: "back_carrying",
    spritesheet: "player_back_carrying",
    frames: [0],
    frameRate: 5,
    repeat: -1,
  },
  FRONT: {
    key: "front",
    spritesheet: "player_front",
    frames: [0],
    frameRate: 5,
    repeat: -1,
  },
  FRONT_CARRYING: {
    key: "front_carrying",
    spritesheet: "player_front_carrying",
    frames: [0],
    frameRate: 5,
    repeat: -1,
  },

  /** Grabbing / Pushing animations */
  GRAB_IDLE: {
    key: "grab_idle",
    spritesheet: "player_dragging",
    frames: [0],
    frameRate: 13,
    repeat: -1,
  },
  PUSH: {
    key: "push",
    spritesheet: "player_dragging",
    frames: [1, 2, 3, 4, 5, 6],
    frameRate: 13,
    repeat: -1,
  },
  PULL: {
    key: "pull",
    spritesheet: "player_dragging",
    frames: [6, 5, 4, 3, 2, 1],
    frameRate: 13,
    repeat: -1,
  },

  /** Initial animation on player creation */
  INITIAL_ANIM: "idle",
} as const;

// ------------------------------------------------------------
// EVENTS (scene.events.emit / on)
// ------------------------------------------------------------
export const PLAYER_EVENTS = {} as const;
