const mockPlay = jest.fn().mockResolvedValue(undefined);
const mockPause = jest.fn();
let mockOnended: (() => void) | null = null;
let mockOnerror: (() => void) | null = null;
let mockOnplay: (() => void) | null = null;

class MockAudio {
  src: string;
  paused = true;
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(src?: string) {
    this.src = src ?? "";
  }

  play() {
    this.paused = false;
    mockOnplay = this.onplay;
    mockOnended = this.onended;
    mockOnerror = this.onerror;
    return mockPlay();
  }

  pause() {
    this.paused = true;
    mockPause();
  }
}

(globalThis as Record<string, unknown>).Audio = MockAudio;

const mockSpeak = jest.fn();
const mockCancel = jest.fn();
let mockUtteranceOnend: (() => void) | null = null;
let _mockUtteranceOnerror: (() => void) | null = null;

class MockSpeechSynthesisUtterance {
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(_text?: string) {
    mockUtteranceOnend = null;
    _mockUtteranceOnerror = null;
  }
}

Object.defineProperty(window, "speechSynthesis", {
  value: {
    speak: mockSpeak.mockImplementation(
      (utterance: MockSpeechSynthesisUtterance) => {
        mockUtteranceOnend = utterance.onend;
        _mockUtteranceOnerror = utterance.onerror;
      },
    ),
    cancel: mockCancel,
    speaking: false,
  },
  writable: true,
});

(globalThis as Record<string, unknown>).SpeechSynthesisUtterance =
  MockSpeechSynthesisUtterance;

const mockFetch = jest.fn();
(globalThis as Record<string, unknown>).fetch = mockFetch;

const mockCreateObjectURL = jest.fn(() => "blob:mock-url");
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(URL, "createObjectURL", {
  value: mockCreateObjectURL,
  writable: true,
});
Object.defineProperty(URL, "revokeObjectURL", {
  value: mockRevokeObjectURL,
  writable: true,
});

jest.spyOn(console, "error").mockImplementation(() => {});

import { AudioAccessibilityService as service } from "./AudioAccessibilityService";

function createMockSoundManager() {
  return { volume: 1 } as unknown as import("phaser").Sound.BaseSoundManager;
}

function flushPromises() {
  return new Promise((r) => setTimeout(r, 0));
}

describe("AudioAccessibilityServiceImpl", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockPlay.mockReset();
    mockPlay.mockResolvedValue(undefined);
    mockPause.mockReset();
    mockCreateObjectURL.mockClear();
    mockRevokeObjectURL.mockClear();
    mockSpeak.mockReset();
    mockSpeak.mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
      mockUtteranceOnend = utterance.onend;
      _mockUtteranceOnerror = utterance.onerror;
    });
    mockCancel.mockReset();
    mockOnended = null;
    mockOnerror = null;
    mockOnplay = null;
    mockUtteranceOnend = null;
    _mockUtteranceOnerror = null;

    mockFetch.mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(new Blob(["audio-data"])),
    });

    service.stop();
  });

  describe("speak", () => {
    it("resolves when proxy audio playback ends", async () => {
      const promise = service.speak("hello world");
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "hello world",
          voice: "Brazilian Portuguese Female",
          rate: undefined,
          pitch: undefined,
        }),
      });

      mockOnended?.();

      await expect(promise).resolves.toBeUndefined();
    });

    it("sends correct payload with options", async () => {
      service.speak("test", { voice: "en-US", rate: 1.5, pitch: 0.8 });
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: "test",
          voice: "en-US",
          rate: 1.5,
          pitch: 0.8,
        }),
      });
    });

    it("resolves immediately for empty text", async () => {
      await expect(service.speak("")).resolves.toBeUndefined();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("falls back to native TTS on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const promise = service.speak("fallback test");
      await flushPromises();

      expect(mockSpeak).toHaveBeenCalled();
      mockUtteranceOnend?.();

      await expect(promise).resolves.toBeUndefined();
    });

    it("falls back to native TTS on non-OK response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 502,
        blob: jest.fn(),
      });

      const promise = service.speak("fallback test");
      await flushPromises();

      expect(mockSpeak).toHaveBeenCalled();
      mockUtteranceOnend?.();

      await expect(promise).resolves.toBeUndefined();
    });

    it("falls back to native TTS when audio.onerror fires", async () => {
      const promise = service.speak("error test");
      await flushPromises();

      mockOnerror?.();
      mockUtteranceOnend?.();

      await expect(promise).resolves.toBeUndefined();
    });

    it("calls duckVolume when audio starts playing", async () => {
      const manager = createMockSoundManager();
      service.setSoundManager(manager);

      service.speak("duck test");
      await flushPromises();

      mockOnplay?.();

      expect(manager.volume).toBe(0.3);
    });

    it("calls restoreVolume when audio ends", async () => {
      const manager = createMockSoundManager();
      service.setSoundManager(manager);

      service.speak("restore test");
      await flushPromises();

      mockOnplay?.();
      expect(manager.volume).toBe(0.3);

      mockOnended?.();
      expect(manager.volume).toBe(1);
    });

    it("revokes object URL after playback", async () => {
      service.speak("revoke test");
      await flushPromises();

      mockOnended?.();

      expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });

    it("only latest speak() call takes effect", async () => {
      service.speak("first");
      await flushPromises();

      const promise2 = service.speak("second");
      await flushPromises();

      mockOnended?.();

      await expect(promise2).resolves.toBeUndefined();
    });
  });

  describe("stop", () => {
    it("pauses current audio", async () => {
      service.speak("stop test");
      await flushPromises();

      service.stop();

      expect(mockPause).toHaveBeenCalled();
    });

    it("cancels speechSynthesis", () => {
      service.stop();
      expect(mockCancel).toHaveBeenCalled();
    });

    it("restores volume after ducking", async () => {
      const manager = createMockSoundManager();
      service.setSoundManager(manager);

      service.speak("duck stop test");
      await flushPromises();

      mockOnplay?.();
      expect(manager.volume).toBe(0.3);

      service.stop();
      expect(manager.volume).toBe(1);
    });
  });

  describe("isPlaying", () => {
    it("returns false when no audio is playing", () => {
      expect(service.isPlaying()).toBe(false);
    });
  });

  describe("setSoundManager", () => {
    it("enables volume ducking", async () => {
      const manager = createMockSoundManager();
      service.setSoundManager(manager);

      service.speak("ducking test");
      await flushPromises();

      mockOnplay?.();
      expect(manager.volume).toBe(0.3);

      mockOnended?.();
      expect(manager.volume).toBe(1);
    });

    it("does not duck when no sound manager set", async () => {
      service.speak("no manager test");
      await flushPromises();

      mockOnplay?.();

      expect(mockPlay).toHaveBeenCalled();
    });
  });

  describe("voice selection", () => {
    it("defaults to Brazilian Portuguese Female", () => {
      expect(service.getVoice()).toBe("Brazilian Portuguese Female");
    });

    it("setVoice changes the voice used in subsequent speak() calls", async () => {
      service.setVoice("US English Female");

      service.speak("english test");
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tts/synthesize",
        expect.objectContaining({
          body: JSON.stringify({
            text: "english test",
            voice: "US English Female",
            rate: undefined,
            pitch: undefined,
          }),
        }),
      );
    });

    it("per-call voice option overrides setVoice", async () => {
      service.setVoice("US English Female");

      service.speak("french test", { voice: "French Female" });
      await flushPromises();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/tts/synthesize",
        expect.objectContaining({
          body: JSON.stringify({
            text: "french test",
            voice: "French Female",
            rate: undefined,
            pitch: undefined,
          }),
        }),
      );
    });
  });
});
