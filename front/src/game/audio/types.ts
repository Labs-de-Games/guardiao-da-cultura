// ============================================================
//  AUDIO TYPES
//  Type definitions for the audio system.
// ============================================================

/**
 * Semantic keys for sound effects.
 * These are global across all levels.
 */
export type SfxKey =
  // Clue interaction
  | "sfx.clue.inspect"
  // Object manipulation
  | "sfx.object.drag_start"
  | "sfx.object.drag_loop"
  | "sfx.object.drop"
  // Player movement
  | "sfx.player.footstep"
  // Rat sounds
  | "sfx.rat.squeak"
  | "sfx.rat.flee"
  // Magnifying glass
  | "sfx.magnifying.up"
  | "sfx.magnifying.down"
  // UI feedback
  | "sfx.ui.click"
  | "sfx.ui.hover"
  | "sfx.ui.modal_open"
  | "sfx.ui.modal_close"
  // Puzzle/quiz
  | "sfx.puzzle.success"
  | "sfx.puzzle.failure"
  // Rewards
  | "sfx.badge.unlock"
  | "sfx.level.complete";

/**
 * Semantic keys for music tracks.
 * Level-specific music follows pattern: "music.level_{id}.main"
 */
export type MusicKey = `music.level_${string}.main` | "music.menu";

/**
 * Combined audio key type.
 */
export type AudioKey = SfxKey | MusicKey;

/**
 * Configuration for a single audio asset.
 */
export interface AudioAssetConfig {
  /** Semantic key for referencing this audio */
  key: AudioKey;
  /** Path to the audio file (relative to assets/) */
  path: string;
  /** Whether this audio should loop (default: false for SFX, true for music) */
  loop?: boolean;
  /** Default volume for this specific audio (0-1, overrides category volume) */
  volume?: number;
}

/**
 * Configuration for a sound pool with multiple variations.
 * When played, a random variation is selected.
 */
export interface AudioPoolConfig {
  /** Semantic key for referencing this pool (used with playSfx) */
  key: SfxKey;
  /** Array of paths to audio files (relative to assets/) */
  paths: string[];
  /** Whether sounds in this pool should loop (default: false) */
  loop?: boolean;
  /** Default volume for sounds in this pool (0-1) */
  volume?: number;
  /** Whether to avoid playing the same variation twice in a row */
  avoidRepeat?: boolean;
}

/**
 * Union type for audio assets (single or pool).
 */
export type AudioAssetDefinition = AudioAssetConfig | AudioPoolConfig;

/**
 * Type guard to check if an asset definition is a pool config.
 */
export function isPoolConfig(
  asset: AudioAssetDefinition,
): asset is AudioPoolConfig {
  return "paths" in asset;
}

/**
 * Audio manifest for a level.
 * Defines all audio assets needed for a specific level.
 */
export interface LevelAudioManifest {
  /** Level ID this manifest belongs to */
  levelId: string;
  /** Background music for this level */
  music?: AudioAssetConfig;
  /** Sound effects specific to this level (extends global SFX) */
  sfx?: AudioAssetDefinition[];
}

/**
 * Global audio manifest.
 * Contains SFX used across all levels.
 */
export interface GlobalAudioManifest {
  /** Global sound effects (single or pools) */
  sfx: AudioAssetDefinition[];
  /** Menu music (played outside gameplay) */
  menuMusic?: AudioAssetConfig;
}

/**
 * Audio settings persisted to localStorage.
 */
export interface AudioSettings {
  /** Master music volume (0-1) */
  musicVolume: number;
  /** Master SFX volume (0-1) */
  sfxVolume: number;
  /** Whether all audio is muted */
  muted: boolean;
}

/**
 * Default audio settings.
 */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
};

/**
 * LocalStorage key for audio settings.
 */
export const AUDIO_SETTINGS_KEY = "gameplate_audio_settings";

/**
 * Audio category for volume control.
 */
export type AudioCategory = "music" | "sfx";

/**
 * Type alias for Phaser sound with volume/mute control.
 */
export type Sound =
  | Phaser.Sound.WebAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.NoAudioSound;

/**
 * Sound instance wrapper for tracking playback.
 */
export interface SoundInstance {
  /** Phaser sound object */
  sound: Sound;
  /** Audio key this sound was created from (may be a variation key for pools) */
  key: string;
  /** Category of this sound */
  category: AudioCategory;
}
