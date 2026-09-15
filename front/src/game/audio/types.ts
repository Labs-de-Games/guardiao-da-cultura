/** Semantic keys for sound effects.
 * These are global across all levels. */
export type SfxKey =
  | "sfx.clue.inspect"
  | "sfx.object.drag_loop"
  | "sfx.object.drop"
  | "sfx.player.climb"
  | "sfx.player.footstep"
  | "sfx.player.jump"
  | "sfx.player.land"
  | "sfx.rat.squeak"
  | "sfx.rat.flee"
  | "sfx.magnifying.up"
  | "sfx.magnifying.down"
  | "sfx.ui.click"
  | "sfx.ui.hover"
  | "sfx.ui.modal_open"
  | "sfx.ui.modal_close"
  | "sfx.puzzle.success"
  | "sfx.puzzle.failure"
  | "sfx.badge.unlock"
  | "sfx.level.complete"
  | "sfx.star.earned"
  | "sfx.ladder.drop"
  | "sfx.camera.click"
  | "sfx.switch"
  | "sfx.light_bar.fix"
  | "sfx.genius.green"
  | "sfx.genius.red"
  | "sfx.genius.yellow"
  | "sfx.genius.blue";

/** Semantic keys for music tracks.
 * Level-specific music follows pattern: "music.level_{id}.main" */
export type MusicKey = `music.level_${string}.main` | "music.menu";
export type MusicIntroKey = `music.level_${string}.intro`;
export type MusicLoopKey = `music.level_${string}.loop`;
/** Layer tracks that start muted and are unlocked individually (e.g. per-instrument band stems). */
export type MusicLayerKey = `music.level_${string}.layer.${string}`;

// Combined audio key type.
export type AudioKey =
  | SfxKey
  | MusicKey
  | MusicIntroKey
  | MusicLoopKey
  | MusicLayerKey;

export interface AudioAssetConfig {
  key: AudioKey;
  path: string;
  loop?: boolean; // default: false for SFX, true for music
  volume?: number; // for this specific audio (0-1, overrides category volume)
}

/** Configuration for a sound pool with multiple variations.
 * When played, a random variation is selected. */
export interface AudioPoolConfig {
  key: SfxKey;
  paths: string[];
  loop?: boolean; // default: false
  volume?: number;
  avoidRepeat?: boolean; // Avoid playing the same variation twice in a row
}

export type AudioAssetDefinition = AudioAssetConfig | AudioPoolConfig;

// Type guard to check if an asset definition is a pool config.
export function isSoundPoolConfig(
  asset: AudioAssetDefinition,
): asset is AudioPoolConfig {
  return "paths" in asset;
}

// Audio manifest for a level. Defines all audio assets needed for that level.
export interface LevelAudioManifest {
  levelId: string;
  music?: AudioAssetConfig; // Background music for this level
  /** Intro + loop music for seamless transition */
  musicIntroLoop?: {
    intro: AudioAssetConfig; // Intro track played once
    loop: AudioAssetConfig; // Loop track played after intro, repeats forever
  };
  /** Muted-by-default music layers, unlocked individually via AudioManager.unlockMusicLayer. */
  musicLayers?: AudioAssetConfig[];
  sfx?: AudioAssetDefinition[]; // Level-specific SFX (extends global SFX)
}

// Global audio manifest
export interface GlobalAudioManifest {
  sfx: AudioAssetDefinition[];
  menuMusic?: AudioAssetConfig;
}

// Audio settings persisted to localStorage.
export interface AudioSettings {
  musicVolume: number; // Master music volume (0-1)
  sfxVolume: number; // Master SFX volume (0-1)
  muted: boolean;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicVolume: 0.1,
  sfxVolume: 0.7,
  muted: false,
};

// LocalStorage key for audio settings.
export const AUDIO_SETTINGS_KEY = "gameplate_audio_settings";

// Audio category for volume control.
export type AudioCategory = "music" | "sfx";

// Type alias for Phaser sound with volume/mute control.
export type Sound =
  | Phaser.Sound.WebAudioSound
  | Phaser.Sound.HTML5AudioSound
  | Phaser.Sound.NoAudioSound;

// Sound instance wrapper for tracking playback.
export interface SoundInstance {
  sound: Sound;
  key: string;
  category: AudioCategory;
  /** For intro+loop music: the loop key to play after intro completes */
  loopKey?: string;
  /** True while intentionally silent (volume forced to 0) until explicitly unlocked. */
  locked?: boolean;
}
