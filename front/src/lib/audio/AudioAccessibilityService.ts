import type * as Phaser from "phaser";

const DUCK_VOLUME = 0.3;
const DEFAULT_VOICE = "Brazilian Portuguese Female";

class AudioAccessibilityServiceImpl {
  private static instance: AudioAccessibilityServiceImpl;
  private soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private originalVolume = 1;
  private isDucked = false;
  private currentAudio: HTMLAudioElement | null = null;
  private speakRequestId = 0;
  private voice: string = DEFAULT_VOICE;
  private volume: number = 1;

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

  setVoice(voice: string): void {
    this.voice = voice;
  }

  getVoice(): string {
    return this.voice;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.volume;
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

  private speakNative(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.onstart = () => this.duckVolume();
      utterance.onend = () => {
        this.restoreVolume();
        resolve();
      };
      utterance.onerror = () => {
        this.restoreVolume();
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  speak(text: string): Promise<void> {
    if (!text) return Promise.resolve();
    this.stop();
    this.primeAudioContext();

    const requestId = ++this.speakRequestId;

    // Raw fetch instead of apiClient: endpoint returns binary audio/mpeg,
    // not JSON. Axios interceptors expect JSON responses.
    return fetch("/api/tts/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: this.voice,
      }),
    })
      .then((response) => {
        if (requestId !== this.speakRequestId) return;

        if (!response.ok) {
          throw new Error(`TTS synthesis failed: ${response.status}`);
        }

        return response.blob();
      })
      .then((blob) => {
        if (requestId !== this.speakRequestId || !blob) return;

        return new Promise<void>((resolve) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.volume = this.volume;
          this.currentAudio = audio;

          audio.onplay = () => this.duckVolume();
          audio.onended = () => {
            this.restoreVolume();
            URL.revokeObjectURL(url);
            this.currentAudio = null;
            resolve();
          };
          audio.onerror = () => {
            this.restoreVolume();
            URL.revokeObjectURL(url);
            this.currentAudio = null;
            this.speakNative(text).then(resolve);
          };

          void audio.play();
        });
      })
      .catch(() => {
        if (requestId === this.speakRequestId) {
          return this.speakNative(text);
        }
      });
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
