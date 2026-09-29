// ============================================================
//  AUDIO LOADER
//  Functions for loading audio assets in Phaser scenes.
// ============================================================

import { getGlobalAudioAssets, getLevelAudioManifest } from "./registry";
import type { AudioAssetDefinition, AudioPoolConfig } from "./types";
import { isSoundPoolConfig } from "./types";

/**
 * Registry of loaded sound pools.
 * Maps pool key to array of loaded variation keys.
 */
const soundPoolRegistry: Map<string, string[]> = new Map();

/**
 * Get the variation keys for a sound pool.
 * Returns undefined if the key is not a pool.
 */
export function getPoolVariations(poolKey: string): string[] | undefined {
  return soundPoolRegistry.get(poolKey);
}

/**
 * Check if a key is registered as a sound pool.
 */
export function isSoundPoolKey(key: string): boolean {
  return soundPoolRegistry.has(key);
}

/**
 * Load global audio assets (SFX and menu music).
 * Call this in the BootScene or PreloadScene.
 *
 * @param scene - The Phaser scene to load assets into
 */
export function loadGlobalAudio(scene: Phaser.Scene): void {
  const assets = getGlobalAudioAssets();
  loadAudioAssets(scene, assets);
}

/**
 * Load audio assets for a specific level.
 * Call this in the GameScene preload method.
 *
 * @param scene - The Phaser scene to load assets into
 * @param levelId - The level ID to load audio for
 */
export function loadLevelAudio(scene: Phaser.Scene, levelId: string): void {
  const manifest = getLevelAudioManifest(levelId);
  if (!manifest) {
    console.warn(`[AudioLoader] No audio manifest found for level: ${levelId}`);
    return;
  }

  const assets: AudioAssetDefinition[] = [];

  // Handle simple music loop
  if (manifest.music) {
    assets.push(manifest.music);
  }

  // Handle intro + loop music
  if (manifest.musicIntroLoop) {
    assets.push(manifest.musicIntroLoop.intro);
    assets.push(manifest.musicIntroLoop.loop);
  }

  // Handle muted-by-default music layers
  if (manifest.musicLayers) {
    assets.push(...manifest.musicLayers);
  }

  // Handle level-specific SFX
  if (manifest.sfx) {
    assets.push(...manifest.sfx);
  }

  loadAudioAssets(scene, assets);
}

/**
 * Load a list of audio assets into a scene.
 * Handles both single sounds and sound pools.
 *
 * @param scene - The Phaser scene to load assets into
 * @param assets - Array of audio asset configurations
 */
export function loadAudioAssets(
  scene: Phaser.Scene,
  assets: AudioAssetDefinition[],
): void {
  assets.forEach((asset) => {
    if (isSoundPoolConfig(asset)) {
      loadSoundPool(scene, asset);
    } else {
      scene.load.audio(asset.key, asset.path);
    }
  });
}

/**
 * Load a sound pool into a scene.
 * Each variation is loaded with a unique key: `{poolKey}_{index}`.
 *
 * @param scene - The Phaser scene to load assets into
 * @param pool - Sound pool configuration
 */
function loadSoundPool(scene: Phaser.Scene, pool: AudioPoolConfig): void {
  const variationKeys: string[] = [];

  pool.paths.forEach((path, index) => {
    const variationKey = `${pool.key}_${index}`;
    variationKeys.push(variationKey);
    scene.load.audio(variationKey, path);
  });

  // Register the pool
  soundPoolRegistry.set(pool.key, variationKeys);
}

/**
 * Register a single audio asset with a scene.
 * Use this for dynamically loaded audio.
 *
 * @param scene - The Phaser scene to register the audio with
 * @param config - Audio asset configuration
 */
export function registerAudio(
  scene: Phaser.Scene,
  config: AudioAssetDefinition,
): void {
  if (isSoundPoolConfig(config)) {
    loadSoundPool(scene, config);
  } else {
    scene.load.audio(config.key, config.path);
  }
}

/**
 * Check if an audio asset is loaded in the scene.
 *
 * @param scene - The Phaser scene to check
 * @param key - The audio key to check
 */
export function isAudioLoaded(scene: Phaser.Scene, key: string): boolean {
  return scene.cache.audio.has(key);
}

/**
 * Get the audio manifest for a level (re-export for convenience).
 */
export { getLevelAudioManifest };
