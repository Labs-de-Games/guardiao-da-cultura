import type * as Phaser from "phaser";

const DUCK_VOLUME = 0.3;
const DEFAULT_VOICE = "pt-BR";

interface SpeakOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

class AudioAccessibilityServiceImpl {
  private static instance: AudioAccessibilityServiceImpl;
  private soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private originalVolume = 1;
  private isDucked = false;
  private currentAudio: HTMLAudioElement | null = null;

  private constructor() {}

  static getInstance(): AudioAccessibilityServiceImpl {
    if (!AudioAccessibilityServiceImpl.instance) {
      AudioAccessibilityServiceImpl.instance =
        new AudioAccessibilityServiceImpl();
    }
    return AudioAccessibilityServiceImpl.instance;
  }

  setSoundManager(manager: Phaser.Sound.BaseSoundManager): void {
    this.soundManager = manager;
  }

  init(): void {
    // No-op — backend proxy handles TTS
  }

  private duckVolume(): void {
    if (!this.soundManager || this.isDucked) return;
    this.originalVolume = this.soundManager.volume;
    this.soundManager.volume = this.originalVolume * DUCK_VOLUME;
    this.isDucked = true;
  }

  private restoreVolume(): void {
    if (!this.soundManager || !this.isDucked) return;
    this.soundManager.volume = this.originalVolume;
    this.isDucked = false;
  }

  private primeAudioContext(): void {
    if (typeof window === "undefined") return;
    try {
      const silent = new Audio(
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=",
      );
      void silent.play();
    } catch {
      // Best effort — unlock audio context for the page.
    }
  }

  private speakNative(text: string): void {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.onstart = () => this.duckVolume();
    utterance.onend = () => this.restoreVolume();
    window.speechSynthesis.speak(utterance);
  }

  async speak(text: string, options?: SpeakOptions): Promise<void> {
    if (!text) return;
    this.stop();
    this.primeAudioContext();

    try {
      const response = await fetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: options?.voice ?? DEFAULT_VOICE,
          rate: options?.rate,
          pitch: options?.pitch,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS synthesis failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onplay = () => this.duckVolume();
      audio.onended = () => {
        this.restoreVolume();
        URL.revokeObjectURL(url);
        this.currentAudio = null;
      };
      audio.onerror = () => {
        this.restoreVolume();
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        this.speakNative(text);
      };

      await audio.play();
    } catch {
      this.speakNative(text);
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.restoreVolume();
  }

  isPlaying(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) return true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      return window.speechSynthesis.speaking;
    }
    return false;
  }
}

export const AudioAccessibilityService =
  AudioAccessibilityServiceImpl.getInstance();
