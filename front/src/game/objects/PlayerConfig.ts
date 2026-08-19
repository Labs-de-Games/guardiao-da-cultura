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
    frameWidth: 64,
    frameHeight: 44,
  },
  IDLE_SPRITESHEET: {
    key: "player_idle",
    path: "player/animations/idle.png",
    frameWidth: 48,
    frameHeight: 48,
  },
  JUMP_SPRITESHEET: {
    key: "player_jump",
    path: "player/animations/jump.png",
    frameWidth: 64,
    frameHeight: 48,
  },
  CLIMB_SPRITESHEET: {
    key: "player_climb",
    path: "player/animations/climbing.png",
    frameWidth: 48,
    frameHeight: 46,
  },
  DRAGGING_SPRITESHEET: {
    key: "player_dragging",
    path: "player/animations/dragging.png",
    frameWidth: 64,
    frameHeight: 42,
  },
  CARRYING_IDLE_SPRITESHEET: {
    key: "player_carrying_idle",
    path: "player/animations/carrying_idle.png",
    frameWidth: 64,
    frameHeight: 45,
  },
  CARRYING_WALK_SPRITESHEET: {
    key: "player_carrying_walk",
    path: "player/animations/carrying_walk.png",
    frameWidth: 64,
    frameHeight: 46,
  },
  CARRYING_JUMP_SPRITESHEET: {
    key: "player_carrying_jump",
    path: "player/animations/carrying_jump.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  BACK_SPRITESHEET: {
    key: "player_back",
    path: "player/animations/walk_north.png",
    frameWidth: 64,
    frameHeight: 64,
  },
  BACK_CARRYING_SPRITESHEET: {
    key: "player_back_carrying",
    path: "player/animations/carrying_north_walk.png",
    frameWidth: 48,
    frameHeight: 44,
  },
  FRONT_SPRITESHEET: {
    key: "player_front",
    path: "player/animations/walk_south.png",
    frameWidth: 64,
    frameHeight: 47,
  },
  FRONT_CARRYING_SPRITESHEET: {
    key: "player_front_carrying",
    path: "player/animations/carrying_south_walk.png",
    frameWidth: 48,
    frameHeight: 44,
  },
  IDLE_SOUTH_SPRITESHEET: {
    key: "player_idle_south",
    path: "player/animations/idle_south.png",
    frameWidth: 64,
    frameHeight: 45,
  },
  CARRY_IDLE_SOUTH_SPRITESHEET: {
    key: "player_carry_idle_south",
    path: "player/animations/carrying_south_idle.png",
    frameWidth: 48,
    frameHeight: 44,
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

  /**
   * carrying_jump.png's frame canvas (64px tall) is taller than the other
   * carry frames (45-46px) to fit the raised jump pose, which leaves ~10px
   * of transparent padding below the character's feet. Subtracted from the
   * foot-anchored offset so the hitbox tracks the sprite, not the canvas.
   */
  CARRY_JUMP_FOOT_PADDING: 10,

  /**
   * Total vertical padding baked into carrying_jump.png's 64px-tall canvas
   * (~9px above, ~10px below the character) versus the other carry frames'
   * tight 45-46px canvas. Subtracted from the frame height anywhere the
   * carried item's offset is derived from it, so the item doesn't jump
   * further from the player just because that texture's canvas is taller.
   */
  CARRY_JUMP_CANVAS_PADDING: 18,

  /**
   * idle.png's 48px-tall canvas leaves ~2px of transparent padding below the
   * character's feet (they stop around y=46). Subtracted from the
   * foot-anchored offset so the idle hitbox tracks the sprite, not the canvas.
   */
  IDLE_FOOT_PADDING: 2,

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
    frames: [0, 1, 2, 3, 4, 5],
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
    spritesheet: PLAYER_ASSETS.CARRYING_IDLE_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 7,
    repeat: -1,
  },
  CARRY_WALK: {
    key: "carry_walk",
    spritesheet: PLAYER_ASSETS.CARRYING_WALK_SPRITESHEET.key,
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
  CARRY_JUMP: {
    key: "carry_jump",
    spritesheet: PLAYER_ASSETS.CARRYING_JUMP_SPRITESHEET.key,
    frames: [1, 2, 3, 4, 5, 6, 7, 8],
    frameRate: 17,
    repeat: 0,
  },

  CLIMB: {
    key: "climb",
    spritesheet: PLAYER_ASSETS.CLIMB_SPRITESHEET.key,
    frames: [0, 1, 2, 3],
    frameRate: 5,
    repeat: -1,
  },
  CLIMB_DOWN: {
    key: "climb_down",
    spritesheet: PLAYER_ASSETS.CLIMB_SPRITESHEET.key,
    frames: [3, 2, 1, 0],
    frameRate: 5,
    repeat: -1,
  },
  BACK: {
    key: "back",
    spritesheet: PLAYER_ASSETS.BACK_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 15,
    repeat: -1,
  },
  BACK_CARRYING: {
    key: "back_carrying",
    spritesheet: PLAYER_ASSETS.BACK_CARRYING_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 15,
    repeat: -1,
  },
  FRONT: {
    key: "front",
    spritesheet: PLAYER_ASSETS.FRONT_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 15,
    repeat: -1,
  },
  FRONT_CARRYING: {
    key: "front_carrying",
    spritesheet: PLAYER_ASSETS.FRONT_CARRYING_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6],
    frameRate: 15,
    repeat: -1,
  },
  IDLE_SOUTH: {
    key: "idle_south",
    spritesheet: PLAYER_ASSETS.IDLE_SOUTH_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    frameRate: 7,
    repeat: -1,
  },
  CARRY_IDLE_SOUTH: {
    key: "carry_idle_south",
    spritesheet: PLAYER_ASSETS.CARRY_IDLE_SOUTH_SPRITESHEET.key,
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    frameRate: 7,
    repeat: -1,
  },

  /** Grabbing / Pushing animations */
  GRAB_IDLE: {
    key: "grab_idle",
    spritesheet: PLAYER_ASSETS.DRAGGING_SPRITESHEET.key,
    frames: [0],
    frameRate: 13,
    repeat: -1,
  },
  PUSH: {
    key: "push",
    spritesheet: PLAYER_ASSETS.DRAGGING_SPRITESHEET.key,
    frames: [1, 2, 3, 4, 5, 6],
    frameRate: 13,
    repeat: -1,
  },
  PULL: {
    key: "pull",
    spritesheet: PLAYER_ASSETS.DRAGGING_SPRITESHEET.key,
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
