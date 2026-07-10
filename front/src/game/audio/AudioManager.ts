// ============================================================
//  AUDIO MANAGER
//  Central manager for all game audio playback.
// ============================================================

import { getPoolVariations, isSoundPoolKey } from "./loader";
import type {
  AudioCategory,
  AudioKey,
  AudioSettings,
  Sound,
  SoundInstance,
} from "./types";
import { AUDIO_SETTINGS_KEY, DEFAULT_AUDIO_SETTINGS } from "./types";

/**
 * AudioManager
 *
 * Singleton class that manages all game audio including:
 * - Background music per level
 * - Sound effects for interactions
 * - Volume control (separate for music and SFX)
 * - Mute functionality
 * - Browser autoplay restriction handling
 * - Memory cleanup on scene transitions
 *
 * Usage:
 * ```ts
 * // Initialize in scene
 * AudioManager.init(scene);
 *
 * // Play sounds
 * AudioManager.playSfx("sfx.clue.inspect");
 * AudioManager.playMusic("music.level_1.main");
 *
 * // Control volume
 * AudioManager.setMusicVolume(0.5);
 * AudioManager.setSfxVolume(0.7);
 *
 * // Mute/unmute
 * AudioManager.mute();
 * AudioManager.unmute();
 *
 * // Cleanup on scene shutdown
 * AudioManager.destroy();
 * ```
 */
export class AudioManager {
  private static instance: AudioManager | null = null;

  private scene: Phaser.Scene | null = null;
  private settings: AudioSettings;
  private currentMusic: SoundInstance | null = null;
  private activeSounds: Map<string, SoundInstance> = new Map();
  /** Tracks last played variation index for each pool (for avoidRepeat) */
  private lastPoolVariation: Map<string, number> = new Map();

  private constructor() {
    this.settings = this.loadSettings();
  }

  /**
   * Get the singleton instance of AudioManager.
   */
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /**
   * Initialize the AudioManager with a Phaser scene.
   * Must be called before playing any audio.
   * If music was already playing on a previous scene, it will be resumed
   * on the new scene to handle scene transitions seamlessly.
   */
  public static init(scene: Phaser.Scene): void {
    const instance = AudioManager.getInstance();
    const previousMusicKey = instance.currentMusic?.key ?? null;

    // Clean up sounds from the previous scene
    if (instance.scene && previousMusicKey) {
      instance.stopAllInternal();
      instance.currentMusic = null;
    }

    instance.setScene(scene);

    // Resume music on the new scene if it was playing before
    if (previousMusicKey) {
      instance.playMusicInternal(previousMusicKey as AudioKey);
    }
  }

  /**
   * Destroy the AudioManager instance.
   * Call this on scene shutdown to prevent memory leaks.
   */
  public static destroy(): void {
    const instance = AudioManager.getInstance();
    instance.stopAllInternal();
    instance.scene = null;
    AudioManager.instance = null;
  }

  /**
   * Play a sound effect.
   */
  public static playSfx(key: AudioKey, volume?: number): Sound | null {
    return AudioManager.getInstance().playSound(key, "sfx", volume);
  }

  /**
   * Play background music.
   * Handles autoplay restrictions by queuing music until user interaction.
   */
  public static playMusic(key: AudioKey, fadeInMs?: number): void {
    AudioManager.getInstance().playMusicInternal(key, fadeInMs);
  }

  /**
   * Stop the current background music.
   */
  public static stopMusic(fadeOutMs?: number): void {
    AudioManager.getInstance().stopMusicInternal(fadeOutMs);
  }

  /**
   * Fade out the current music over the specified duration.
   */
  public static fadeOutMusic(durationMs: number): void {
    AudioManager.getInstance().stopMusicInternal(durationMs);
  }

  /**
   * Set the music volume (0-1).
   */
  public static setMusicVolume(volume: number): void {
    AudioManager.getInstance().setVolume("music", volume);
  }

  /**
   * Set the SFX volume (0-1).
   */
  public static setSfxVolume(volume: number): void {
    AudioManager.getInstance().setVolume("sfx", volume);
  }

  /**
   * Mute all audio.
   */
  public static mute(): void {
    AudioManager.getInstance().setMuted(true);
  }

  /**
   * Unmute all audio.
   */
  public static unmute(): void {
    AudioManager.getInstance().setMuted(false);
  }

  /**
   * Toggle mute state.
   */
  public static toggleMute(): boolean {
    const instance = AudioManager.getInstance();
    const newMuted = !instance.settings.muted;
    instance.setMuted(newMuted);
    return newMuted;
  }

  /**
   * Check if audio is muted.
   */
  public static isMuted(): boolean {
    return AudioManager.getInstance().settings.muted;
  }

  /**
   * Get current audio settings.
   */
  public static getSettings(): AudioSettings {
    return { ...AudioManager.getInstance().settings };
  }

  /**
   * Stop all currently playing sounds.
   */
  public static stopAll(): void {
    AudioManager.getInstance().stopAllInternal();
  }

  /**
   * Check if a sound with the given key is currently playing.
   */
  public static isPlaying(key: AudioKey): boolean {
    return AudioManager.getInstance().activeSounds.has(key);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private playSound(
    key: AudioKey,
    category: AudioCategory,
    volumeOverride?: number,
  ): Sound | null {
    if (!this.scene) {
      console.warn(
        `[AudioManager] Cannot play "${key}": no scene set. Call AudioManager.init(scene) first.`,
      );
      return null;
    }

    if (this.settings.muted) {
      return null;
    }

    // Check if this is a sound pool
    let actualKey: string = key;
    if (isSoundPoolKey(key)) {
      const variationKey = this.selectPoolVariation(key);
      if (!variationKey) {
        console.warn(
          `[AudioManager] Sound pool "${key}" has no variations loaded.`,
        );
        return null;
      }
      actualKey = variationKey;
    }

    // Check if sound exists in the audio cache
    if (!this.scene.game.cache.audio.has(actualKey)) {
      console.warn(
        `[AudioManager] Sound "${actualKey}" not loaded. Make sure to preload it.`,
      );
      return null;
    }

    const categoryVolume =
      category === "music"
        ? this.settings.musicVolume
        : this.settings.sfxVolume;
    const volume = volumeOverride ?? categoryVolume;

    const sound = this.scene.sound.add(actualKey, {
      volume,
      loop: category === "music",
    }) as Sound;

    sound.play();

    // Track active sound (use original key for pools)
    this.activeSounds.set(key, { sound, key: actualKey, category });

    // Auto-cleanup when sound completes (for SFX)
    if (category === "sfx") {
      sound.once(Phaser.Sound.Events.COMPLETE, () => {
        this.activeSounds.delete(key);
      });
    }

    return sound;
  }

  /**
   * Select a random variation from a sound pool.
   * Uses avoidRepeat to prevent playing the same variation twice in a row.
   */
  private selectPoolVariation(poolKey: string): string | null {
    const variations = getPoolVariations(poolKey);
    if (!variations || variations.length === 0) {
      return null;
    }

    // If only one variation, return it
    if (variations.length === 1) {
      return variations[0];
    }

    // Get last played variation
    const lastIndex = this.lastPoolVariation.get(poolKey) ?? -1;

    // Select random index, avoiding the last one
    let newIndex: number;
    do {
      newIndex = Math.floor(Math.random() * variations.length);
    } while (newIndex === lastIndex);

    // Store and return
    this.lastPoolVariation.set(poolKey, newIndex);
    return variations[newIndex];
  }

  private playMusicInternal(key: AudioKey, fadeInMs?: number): void {
    // Stop current music if playing
    if (this.currentMusic) {
      this.stopMusicInternal(0);
    }

    const sound = this.playSound(key, "music");
    if (!sound) {
      console.warn(`[AudioManager] Failed to play music "${key}"`);
      return;
    }

    this.currentMusic = this.activeSounds.get(key) ?? null;

    // Fade in if requested
    if (fadeInMs && fadeInMs > 0 && this.scene) {
      sound.volume = 0;
      this.scene.tweens.add({
        targets: sound,
        volume: this.settings.musicVolume,
        duration: fadeInMs,
      });
    }
  }

  private stopMusicInternal(fadeOutMs?: number): void {
    if (!this.currentMusic || !this.scene) {
      return;
    }

    const sound = this.currentMusic.sound;

    if (fadeOutMs && fadeOutMs > 0) {
      // Fade out then stop
      this.scene.tweens.add({
        targets: sound,
        volume: 0,
        duration: fadeOutMs,
        onComplete: () => {
          sound.stop();
          sound.destroy();
          if (this.currentMusic) {
            this.activeSounds.delete(this.currentMusic.key);
          }
          this.currentMusic = null;
        },
      });
    } else {
      // Stop immediately
      sound.stop();
      sound.destroy();
      this.activeSounds.delete(this.currentMusic.key);
      this.currentMusic = null;
    }
  }

  private setVolume(category: AudioCategory, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (category === "music") {
      this.settings.musicVolume = clampedVolume;
      // Update current music volume
      if (this.currentMusic && !this.settings.muted) {
        this.currentMusic.sound.setVolume(clampedVolume);
      }
    } else {
      this.settings.sfxVolume = clampedVolume;
    }

    this.saveSettings();
  }

  private setMuted(muted: boolean): void {
    this.settings.muted = muted;

    if (muted) {
      // Mute all active sounds
      this.activeSounds.forEach(({ sound }) => {
        sound.mute = true;
      });
    } else {
      // Unmute all active sounds
      this.activeSounds.forEach(({ sound, category }) => {
        sound.mute = false;
        // Restore volume based on category
        const volume =
          category === "music"
            ? this.settings.musicVolume
            : this.settings.sfxVolume;
        sound.volume = volume;
      });
    }

    this.saveSettings();
  }

  private stopAllInternal(): void {
    // Stop and destroy all active sounds
    this.activeSounds.forEach(({ sound }) => {
      sound.stop();
      sound.destroy();
    });
    this.activeSounds.clear();
    this.currentMusic = null;
  }

  private loadSettings(): AudioSettings {
    if (typeof window === "undefined") {
      return { ...DEFAULT_AUDIO_SETTINGS };
    }

    try {
      const stored = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AudioSettings>;
        return {
          musicVolume: parsed.musicVolume ?? DEFAULT_AUDIO_SETTINGS.musicVolume,
          sfxVolume: parsed.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume,
          muted: parsed.muted ?? DEFAULT_AUDIO_SETTINGS.muted,
        };
      }
    } catch (error) {
      console.warn(
        "[AudioManager] Failed to load settings from localStorage:",
        error,
      );
    }

    return { ...DEFAULT_AUDIO_SETTINGS };
  }

  private saveSettings(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn(
        "[AudioManager] Failed to save settings to localStorage:",
        error,
      );
    }
  }
}
