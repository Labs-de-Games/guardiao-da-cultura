import type * as Phaser from "phaser";

const DEFAULT_VOICE = "Brazilian Portuguese Female";
const DUCK_VOLUME = 0.3;

const rvKey =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_RESPONSIVE_VOICE_KEY ?? "")
    : "";

interface SpeakOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

interface ResponsiveVoiceInstance {
  speak: (
    text: string,
    voice: string,
    options?: {
      rate?: number;
      pitch?: number;
      volume?: number;
      onstart?: () => void;
      onend?: () => void;
    },
  ) => void;
  cancel: () => void;
  isPlaying: () => boolean;
  getVoices?: () => Array<{ name: string }>;
}

class AudioAccessibilityServiceImpl {
  private static instance: AudioAccessibilityServiceImpl;
  private soundManager: Phaser.Sound.BaseSoundManager | null = null;
  private originalVolume = 1;
  private isDucked = false;
  private rv: ResponsiveVoiceInstance | null = null;
  private initPromise: Promise<void> | null = null;

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
    if (this.initPromise) return;
    if (typeof window === "undefined") return;
    this.initPromise = this.doInit();
  }

  private async doInit(): Promise<void> {
    try {
      const { getResponsiveVoice } = await import("@responsivevoice/core");
      this.rv = await getResponsiveVoice({
        apiKey: rvKey || undefined,
        defaultVoice: DEFAULT_VOICE,
      });
      console.log("[AudioAccessibility] ResponsiveVoice ready (npm)");
      return;
    } catch (err) {
      console.warn("[AudioAccessibility] npm import/init failed:", err);
    }

    console.warn(
      "[AudioAccessibility] ResponsiveVoice unavailable. TTS disabled.",
    );
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

  async speak(text: string, options?: SpeakOptions): Promise<void> {
    if (!text) return;
    await this.initPromise;

    if (!this.rv) {
      console.warn("[AudioAccessibility] RV not ready, cannot speak");
      return;
    }

    if (this.rv.isPlaying()) {
      this.rv.cancel();
    }

    const voice = options?.voice ?? DEFAULT_VOICE;
    const rvOptions: Record<string, unknown> = {};
    if (options?.rate !== undefined) rvOptions.rate = options.rate;
    if (options?.pitch !== undefined) rvOptions.pitch = options.pitch;
    rvOptions.volume = options?.volume ?? 1.0;
    rvOptions.onstart = () => {
      console.log("[AudioAccessibility] Speech started");
      this.duckVolume();
    };
    rvOptions.onend = () => {
      console.log("[AudioAccessibility] Speech ended");
      this.restoreVolume();
    };

    console.log("[AudioAccessibility] speak:", {
      text: text.slice(0, 50),
      voice,
    });
    this.rv.speak(text, voice, rvOptions);
  }

  stop(): void {
    if (this.rv?.isPlaying()) {
      this.rv.cancel();
    }
    this.restoreVolume();
  }

  isPlaying(): boolean {
    if (this.rv) return this.rv.isPlaying();
    return false;
  }
}

export const AudioAccessibilityService =
  AudioAccessibilityServiceImpl.getInstance();
