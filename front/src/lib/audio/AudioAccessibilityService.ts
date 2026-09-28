import type * as Phaser from "phaser";

const DUCK_VOLUME = 0.3;
const DEFAULT_VOICE = "Brazilian Portuguese Female";

/**
 * Status /api/tts/synthesize returns when no ResponsiveVoice key is
 * configured. Kept in sync with TTS_UNAVAILABLE_STATUS in that route.
 */
const TTS_UNAVAILABLE_STATUS = 503;

class AudioAccessibilityServiceImpl {
  private static instance: AudioAccessibilityServiceImpl;
  private soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private originalVolume = 1;
  private isDucked = false;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private speakRequestId = 0;
  private voice: string = DEFAULT_VOICE;
  private volume: number = 1;
  private ttsUnavailable = false;

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
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }
    if (this.currentUtterance) {
      this.currentUtterance.volume = this.volume;
    }
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
      utterance.volume = this.volume;
      this.currentUtterance = utterance;
      utterance.onstart = () => this.duckVolume();
      utterance.onend = () => {
        this.restoreVolume();
        this.currentUtterance = null;
        resolve();
      };
      utterance.onerror = () => {
        this.restoreVolume();
        this.currentUtterance = null;
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  }

  speak(text: string): Promise<void> {
    if (!text) return Promise.resolve();
    this.stop();
    this.primeAudioContext();

    // The server already told us it has no ResponsiveVoice key. Narrate with
    // the browser voice and skip the round trip for every later utterance.
    if (this.ttsUnavailable) {
      return this.speakNative(text);
    }

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

        if (response.status === TTS_UNAVAILABLE_STATUS) {
          // No key configured. An expected state on a fresh install, not a
          // failure — remember it and let the next step use the browser voice.
          this.ttsUnavailable = true;
          return;
        }

        if (!response.ok) {
          throw new Error(`TTS synthesis failed: ${response.status}`);
        }

        return response.blob();
      })
      .then((blob) => {
        if (requestId !== this.speakRequestId) return;

        if (!blob) {
          return this.ttsUnavailable ? this.speakNative(text) : undefined;
        }

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
    this.currentUtterance = null;
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
