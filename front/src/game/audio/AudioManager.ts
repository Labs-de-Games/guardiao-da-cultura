import * as Phaser from "phaser";
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
  // Tracks last played variation index for each pool (for avoidRepeat)
  private lastPoolVariation: Map<string, number> = new Map();

  private constructor() {
    this.settings = this.loadSettings();
  }

  // Get the singleton instance of AudioManager.
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
   * on the new scene to handle scene transitions seamlessly. */
  public static init(scene: Phaser.Scene): void {
    const instance = AudioManager.getInstance();
    instance.setScene(scene);
  }

  /** Destroy the AudioManager instance.
   * Call this on scene shutdown to prevent memory leaks. */
  public static destroy(): void {
    const instance = AudioManager.getInstance();
    instance.stopAllInternal();
    instance.scene = null;
    AudioManager.instance = null;
  }

  // Play a sound effect.
  public static playSfx(key: AudioKey, volume?: number): Sound | null {
    return AudioManager.getInstance().playSound(key, "sfx", volume);
  }

  /**
   * Play a specific variation from a sound pool.
   * Use this when you want a deterministic sound instead of random selection.
   * @param poolKey - The sound pool key (e.g., "sfx.object.drop")
   * @param variationIndex - The index of the variation to play (0-based)
   * @param volume - Optional volume override (0-1)
   */
  public static playSfxVariation(
    poolKey: string,
    variationIndex: number,
    volume?: number,
  ): Sound | null {
    return AudioManager.getInstance().playPoolVariation(
      poolKey,
      variationIndex,
      volume,
    );
  }

  // Play background music.
  public static playMusic(key: AudioKey, fadeInMs?: number): void {
    AudioManager.getInstance().playMusicInternal(key, fadeInMs);
  }

  // Stop the current background music.
  public static stopMusic(fadeOutMs?: number): void {
    AudioManager.getInstance().stopMusicInternal(fadeOutMs);
  }

  // Fade out the current music over the specified duration.
  public static fadeOutMusic(durationMs: number): void {
    AudioManager.getInstance().stopMusicInternal(durationMs);
  }

  /**
   * Start a music layer muted (volume 0), looping indefinitely.
   * Use this for tracks that must play in sync from the start but stay
   * silent until unlocked (e.g. per-instrument stems of one synced song).
   * Unaffected by stopMusic/fadeOutMusic — it isn't tracked as currentMusic.
   */
  public static playMusicLayer(key: AudioKey): void {
    AudioManager.getInstance().playMusicLayerInternal(key);
  }

  /**
   * Unlock a previously-started music layer, bringing it up to the current
   * music volume (optionally fading in over fadeInMs).
   */
  public static unlockMusicLayer(key: AudioKey, fadeInMs?: number): void {
    AudioManager.getInstance().unlockMusicLayerInternal(key, fadeInMs);
  }

  // Set the music volume (0-1).
  public static setMusicVolume(volume: number): void {
    AudioManager.getInstance().setVolume("music", volume);
  }

  // Set the SFX volume (0-1).
  public static setSfxVolume(volume: number): void {
    AudioManager.getInstance().setVolume("sfx", volume);
  }

  // Mute all audio.
  public static mute(): void {
    AudioManager.getInstance().setMuted(true);
  }

  // Unmute all audio.
  public static unmute(): void {
    AudioManager.getInstance().setMuted(false);
  }

  // Toggle mute state.
  public static toggleMute(): boolean {
    const instance = AudioManager.getInstance();
    const newMuted = !instance.settings.muted;
    instance.setMuted(newMuted);
    return newMuted;
  }

  // Check if audio is muted.
  public static isMuted(): boolean {
    return AudioManager.getInstance().settings.muted;
  }

  // Get current audio settings.
  public static getSettings(): AudioSettings {
    return { ...AudioManager.getInstance().settings };
  }

  // Stop all sounds that are currently playing.
  public static stopAll(): void {
    AudioManager.getInstance().stopAllInternal();
  }

  // Check if a sound with the given key is currently playing.
  public static isPlaying(key: AudioKey): boolean {
    return AudioManager.getInstance().activeSounds.has(key);
  }

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
    const volume =
      volumeOverride !== undefined
        ? volumeOverride * categoryVolume
        : categoryVolume;

    // Intro tracks should NOT loop - they transition to the loop track
    const isIntro = key.includes(".intro");
    const shouldLoop = category === "music" && !isIntro;

    const sound = this.scene.sound.add(actualKey, {
      volume,
      loop: shouldLoop,
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

  /** Select a random variation from a sound pool.
   Uses avoidRepeat to prevent playing the same variation twice in a row. */
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

    this.lastPoolVariation.set(poolKey, newIndex);
    return variations[newIndex];
  }

  /**
   * Play a specific variation from a sound pool.
   * Use this for deterministic sounds (e.g., painting drop vs sculpture drop).
   */
  private playPoolVariation(
    poolKey: string,
    variationIndex: number,
    volumeOverride?: number,
  ): Sound | null {
    if (!this.scene) {
      console.warn(
        `[AudioManager] Cannot play "${poolKey}": no scene set. Call AudioManager.init(scene) first.`,
      );
      return null;
    }

    if (this.settings.muted) {
      return null;
    }

    const variations = getPoolVariations(poolKey);
    if (!variations || variations.length === 0) {
      console.warn(`[AudioManager] Sound pool "${poolKey}" has no variations.`);
      return null;
    }

    if (variationIndex < 0 || variationIndex >= variations.length) {
      console.warn(
        `[AudioManager] Invalid variation index ${variationIndex} for pool "${poolKey}" with ${variations.length} variations.`,
      );
      return null;
    }

    const actualKey = variations[variationIndex];

    // Check if sound exists in the audio cache
    if (!this.scene.game.cache.audio.has(actualKey)) {
      console.warn(
        `[AudioManager] Sound "${actualKey}" not loaded. Make sure to preload it.`,
      );
      return null;
    }

    const volume =
      volumeOverride !== undefined
        ? volumeOverride * this.settings.sfxVolume
        : this.settings.sfxVolume;

    const sound = this.scene.sound.add(actualKey, {
      volume,
      loop: false,
    }) as Sound;

    sound.play();

    // Track active sound (use pool key for tracking)
    this.activeSounds.set(poolKey, { sound, key: actualKey, category: "sfx" });

    // Auto-cleanup when sound completes
    sound.once(Phaser.Sound.Events.COMPLETE, () => {
      this.activeSounds.delete(poolKey);
    });

    return sound;
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

    const soundInstance = this.activeSounds.get(key) ?? null;
    this.currentMusic = soundInstance;

    // Check if this is an intro track (has .intro in the key)
    const isIntro = key.includes(".intro");
    if (isIntro && soundInstance) {
      // Store the loop key for seamless transition
      const loopKey = key.replace(".intro", ".loop");
      soundInstance.loopKey = loopKey;

      // Listen for intro completion to start loop
      sound.once(Phaser.Sound.Events.COMPLETE, () => {
        if (this.currentMusic === soundInstance && soundInstance.loopKey) {
          // Start the loop track
          this.playMusicLoop(soundInstance.loopKey);
        }
      });
    }

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

  /** Play the loop portion of intro+loop music.
   * Called automatically when the intro track completes. */
  private playMusicLoop(loopKey: string): void {
    if (!this.scene) return;

    // Check if loop sound exists
    if (!this.scene.game.cache.audio.has(loopKey)) {
      console.warn(`[AudioManager] Loop track "${loopKey}" not loaded.`);
      return;
    }

    // Clean up intro track
    if (this.currentMusic) {
      this.activeSounds.delete(this.currentMusic.key);
    }

    // Play the loop
    const sound = this.scene.sound.add(loopKey, {
      volume: this.settings.musicVolume,
      loop: true,
    }) as Sound;

    if (this.settings.muted) {
      sound.mute = true;
    }

    sound.play();

    // Track as current music
    this.currentMusic = {
      sound,
      key: loopKey,
      category: "music",
    };
    this.activeSounds.set(loopKey, this.currentMusic);
  }

  private playMusicLayerInternal(key: AudioKey): void {
    if (!this.scene) {
      console.warn(
        `[AudioManager] Cannot play layer "${key}": no scene set. Call AudioManager.init(scene) first.`,
      );
      return;
    }

    if (this.activeSounds.has(key)) {
      return;
    }

    if (!this.scene.game.cache.audio.has(key)) {
      console.warn(
        `[AudioManager] Music layer "${key}" not loaded. Make sure to preload it.`,
      );
      return;
    }

    const sound = this.scene.sound.add(key, { volume: 0, loop: true }) as Sound;
    if (this.settings.muted) {
      sound.mute = true;
    }
    sound.play();

    this.activeSounds.set(key, {
      sound,
      key,
      category: "music",
      locked: true,
    });
  }

  private unlockMusicLayerInternal(key: AudioKey, fadeInMs?: number): void {
    const instance = this.activeSounds.get(key);
    if (!instance) return;

    instance.locked = false;
    const targetVolume = this.settings.musicVolume;

    if (fadeInMs && fadeInMs > 0 && this.scene) {
      this.scene.tweens.add({
        targets: instance.sound,
        volume: targetVolume,
        duration: fadeInMs,
      });
    } else {
      instance.sound.setVolume(targetVolume);
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
      // Update every unlocked music-category sound (currentMusic included,
      // since it's always tracked in activeSounds too). Locked layers stay
      // silent until explicitly unlocked.
      if (!this.settings.muted) {
        this.activeSounds.forEach((instance) => {
          if (instance.category === "music" && !instance.locked) {
            instance.sound.setVolume(clampedVolume);
          }
        });
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
      this.activeSounds.forEach(({ sound, category, locked }) => {
        sound.mute = false;
        // Locked layers stay silent until explicitly unlocked; otherwise
        // restore volume based on category
        sound.volume = locked
          ? 0
          : category === "music"
            ? this.settings.musicVolume
            : this.settings.sfxVolume;
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
