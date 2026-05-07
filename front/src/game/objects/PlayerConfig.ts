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
    frameWidth: 48,
    frameHeight: 37,
  },
  JUMP_SPRITESHEET: {
    key: "player_jump",
    path: "player/animations/jump.png",
    frameWidth: 48,
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
    frameWidth: 162,
    frameHeight: 183,
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
  SCALE: 4.5,

  /** Hitbox size (setSize) */
  HITBOX: {
    WIDTH: 12,
    HEIGHT: 38,
  },

  /** Hitbox offset (setOffset) */
  HITBOX_OFFSET: {
    X: 18,
    Y: -1,
  },

  /** Scale and Hitbox for the dragging animation */
  DRAGGING_SCALE: 0.9,
  DRAGGING_HITBOX: {
    WIDTH: 45,
    HEIGHT: 155,
  },
  DRAGGING_HITBOX_OFFSET: {
    X: 60,
    Y: 30,
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
  JUMP_VELOCITY_Y: -1200,

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
    spritesheet: PLAYER_ASSETS.WALK_SPRITESHEET.key,
    frames: [0],
    frameRate: 10,
    repeat: -1,
  },
  WALK: {
    key: "walk",
    spritesheet: PLAYER_ASSETS.WALK_SPRITESHEET.key,
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
    frames: [0, 1, 2, 3],
    frameRate: 13,
    repeat: -1,
  },
  PULL: {
    key: "pull",
    spritesheet: "player_dragging",
    frames: [3, 2, 1, 0],
    frameRate: 13,
    repeat: -1,
  },

  /** Initial animation on player creation */
  INITIAL_ANIM: "idle",
} as const;

// ------------------------------------------------------------
// KEYBINDINGS
// ------------------------------------------------------------
export const PLAYER_KEYS = {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
  W: "W",
  A: "A",
  S: "S",
  D: "D",
  SPACE: "SPACE",
  E: "E",
} as const;

// ------------------------------------------------------------
// EVENTS (scene.events.emit / on)
// ------------------------------------------------------------
export const PLAYER_EVENTS = {} as const;
