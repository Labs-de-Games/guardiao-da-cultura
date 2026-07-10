// ============================================================
//  AUDIO MODULE
//  Barrel export for the audio system.
// ============================================================

export { AudioManager } from "./AudioManager";
export {
  getLevelAudioManifest,
  getPoolVariations,
  isAudioLoaded,
  isSoundPoolKey,
  loadAudioAssets,
  loadGlobalAudio,
  loadLevelAudio,
  registerAudio,
} from "./loader";
export {
  GLOBAL_AUDIO_MANIFEST,
  GLOBAL_SFX,
  getGlobalAudioAssets,
  getLevelAudioAssets,
  LEVEL_AUDIO_MANIFESTS,
} from "./registry";
export {
  AUDIO_SETTINGS_KEY,
  type AudioAssetConfig,
  type AudioAssetDefinition,
  type AudioCategory,
  type AudioKey,
  type AudioPoolConfig,
  type AudioSettings,
  DEFAULT_AUDIO_SETTINGS,
  type GlobalAudioManifest,
  isSoundPoolConfig,
  type LevelAudioManifest,
  type MusicKey,
  type SfxKey,
  type Sound,
  type SoundInstance,
} from "./types";
