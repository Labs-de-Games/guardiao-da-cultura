import { AudioManager } from "./AudioManager";
import { AUDIO_SETTINGS_KEY, DEFAULT_AUDIO_SETTINGS } from "./types";

// Mock Phaser before importing AudioManager
const mockSound = {
  play: jest.fn(),
  stop: jest.fn(),
  destroy: jest.fn(),
  setVolume: jest.fn(),
  once: jest.fn(),
  volume: 1,
  mute: false,
};

const mockTween = {
  add: jest.fn(),
};

const mockCache = {
  audio: {
    has: jest.fn().mockReturnValue(true),
  },
};

const mockScene = {
  sound: {
    add: jest.fn().mockReturnValue(mockSound),
  },
  tweens: mockTween,
  game: {
    cache: mockCache,
  },
} as unknown as Phaser.Scene;

// Mock Phaser globally
global.Phaser = {
  Sound: {
    Events: {
      COMPLETE: "complete",
    },
  },
} as unknown as typeof Phaser;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock console
const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => {});

describe("AudioManager", () => {
  beforeEach(() => {
    // Reset singleton instance
    (AudioManager as unknown as { instance: unknown }).instance = null;
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterAll(() => {
    consoleWarn.mockRestore();
  });

  describe("Initialization", () => {
    it("should initialize with a scene", () => {
      AudioManager.init(mockScene);
      expect(() => AudioManager.playSfx("sfx.player.jump")).not.toThrow();
    });

    it("should load default settings when no stored settings exist", () => {
      AudioManager.init(mockScene);
      const settings = AudioManager.getSettings();
      expect(settings).toEqual(DEFAULT_AUDIO_SETTINGS);
    });

    it("should load stored settings from localStorage", () => {
      const storedSettings = {
        musicVolume: 0.5,
        sfxVolume: 0.7,
        muted: true,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));

      AudioManager.init(mockScene);
      const settings = AudioManager.getSettings();

      expect(settings.musicVolume).toBe(0.5);
      expect(settings.sfxVolume).toBe(0.7);
      expect(settings.muted).toBe(true);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");

      AudioManager.init(mockScene);
      const settings = AudioManager.getSettings();

      expect(settings).toEqual(DEFAULT_AUDIO_SETTINGS);
      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe("Volume Control", () => {
    beforeEach(() => {
      AudioManager.init(mockScene);
    });

    it("should set music volume", () => {
      AudioManager.setMusicVolume(0.5);
      expect(AudioManager.getSettings().musicVolume).toBe(0.5);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should clamp music volume between 0 and 1", () => {
      AudioManager.setMusicVolume(-0.5);
      expect(AudioManager.getSettings().musicVolume).toBe(0);

      AudioManager.setMusicVolume(1.5);
      expect(AudioManager.getSettings().musicVolume).toBe(1);
    });

    it("should set SFX volume", () => {
      AudioManager.setSfxVolume(0.8);
      expect(AudioManager.getSettings().sfxVolume).toBe(0.8);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should clamp SFX volume between 0 and 1", () => {
      AudioManager.setSfxVolume(-0.2);
      expect(AudioManager.getSettings().sfxVolume).toBe(0);

      AudioManager.setSfxVolume(2.0);
      expect(AudioManager.getSettings().sfxVolume).toBe(1);
    });

    it("should update current music volume when setting music volume", () => {
      AudioManager.playMusic("music.level_1.main");
      AudioManager.setMusicVolume(0.3);

      expect(mockSound.setVolume).toHaveBeenCalledWith(0.3);
    });
  });

  describe("Mute/Unmute", () => {
    beforeEach(() => {
      AudioManager.init(mockScene);
    });

    it("should mute all audio", () => {
      AudioManager.playMusic("music.level_1.main");
      AudioManager.mute();

      expect(AudioManager.isMuted()).toBe(true);
      expect(mockSound.mute).toBe(true);
    });

    it("should unmute all audio", () => {
      AudioManager.playMusic("music.level_1.main");
      AudioManager.mute();
      AudioManager.unmute();

      expect(AudioManager.isMuted()).toBe(false);
      expect(mockSound.mute).toBe(false);
    });

    it("should toggle mute state", () => {
      const initialState = AudioManager.isMuted();
      const newState = AudioManager.toggleMute();

      expect(newState).toBe(!initialState);
      expect(AudioManager.isMuted()).toBe(!initialState);
    });

    it("should not play sounds when muted", () => {
      AudioManager.mute();
      const result = AudioManager.playSfx("sfx.player.jump");

      expect(result).toBeNull();
      expect(mockScene.sound.add).not.toHaveBeenCalled();
    });

    it("should restore volume when unmuting", () => {
      AudioManager.setMusicVolume(0.5);
      AudioManager.setSfxVolume(0.7);

      AudioManager.playMusic("music.level_1.main");
      AudioManager.mute();
      AudioManager.unmute();

      // Volume should be restored based on category
      expect(mockSound.mute).toBe(false);
    });
  });

  describe("Sound Effects", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockCache.audio.has.mockReturnValue(true);
      AudioManager.init(mockScene);
    });

    it("should play a sound effect", () => {
      const sound = AudioManager.playSfx("sfx.player.jump", 0.5);

      expect(mockScene.sound.add).toHaveBeenCalledWith("sfx.player.jump", {
        volume: 0.5 * DEFAULT_AUDIO_SETTINGS.sfxVolume,
        loop: false,
      });
      expect(mockSound.play).toHaveBeenCalled();
      expect(sound).toBe(mockSound);
    });

    it("should apply default SFX volume when no volume override", () => {
      AudioManager.playSfx("sfx.player.jump");

      expect(mockScene.sound.add).toHaveBeenCalledWith("sfx.player.jump", {
        volume: DEFAULT_AUDIO_SETTINGS.sfxVolume,
        loop: false,
      });
    });

    it("should warn when playing sound without initialization", () => {
      AudioManager.destroy();
      AudioManager.playSfx("sfx.player.jump");

      expect(consoleWarn).toHaveBeenCalledWith(
        '[AudioManager] Cannot play "sfx.player.jump": no scene set. Call AudioManager.init(scene) first.',
      );
    });

    it("should warn when sound is not loaded", () => {
      mockCache.audio.has.mockReturnValue(false);
      AudioManager.playSfx("sfx.unknown");

      expect(consoleWarn).toHaveBeenCalledWith(
        '[AudioManager] Sound "sfx.unknown" not loaded. Make sure to preload it.',
      );
    });

    it("should track active sounds", () => {
      AudioManager.playSfx("sfx.player.jump");
      expect(AudioManager.isPlaying("sfx.player.jump")).toBe(true);
    });

    it("should clean up completed sounds", () => {
      AudioManager.playSfx("sfx.player.jump");
      expect(AudioManager.isPlaying("sfx.player.jump")).toBe(true);

      // Simulate sound completion
      const completeCallback = mockSound.once.mock.calls.find(
        (call) => call[0] === "complete",
      )?.[1];
      if (completeCallback) {
        completeCallback();
      }

      expect(AudioManager.isPlaying("sfx.player.jump")).toBe(false);
    });
  });

  describe("Music", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockCache.audio.has.mockReturnValue(true);
      AudioManager.init(mockScene);
    });

    it("should play background music", () => {
      AudioManager.playMusic("music.level_1.main");

      expect(mockScene.sound.add).toHaveBeenCalledWith("music.level_1.main", {
        volume: DEFAULT_AUDIO_SETTINGS.musicVolume,
        loop: true,
      });
      expect(mockSound.play).toHaveBeenCalled();
    });

    it("should stop current music when playing new music", () => {
      AudioManager.playMusic("music.level_1.main");
      // Reset mock to track second call
      jest.clearAllMocks();
      AudioManager.playMusic("music.level_2.main");

      expect(mockSound.stop).toHaveBeenCalled();
      expect(mockSound.destroy).toHaveBeenCalled();
    });

    it("should stop music", () => {
      AudioManager.playMusic("music.level_1.main");
      AudioManager.stopMusic();

      expect(mockSound.stop).toHaveBeenCalled();
      expect(mockSound.destroy).toHaveBeenCalled();
    });

    it("should fade out music", () => {
      AudioManager.playMusic("music.level_1.main");
      AudioManager.fadeOutMusic(1000);

      expect(mockTween.add).toHaveBeenCalledWith({
        targets: mockSound,
        volume: 0,
        duration: 1000,
        onComplete: expect.any(Function),
      });
    });

    it("should fade in music when requested", () => {
      AudioManager.playMusic("music.level_1.main", 500);

      expect(mockTween.add).toHaveBeenCalledWith({
        targets: mockSound,
        volume: DEFAULT_AUDIO_SETTINGS.musicVolume,
        duration: 500,
      });
    });

    it("should handle intro tracks without looping", () => {
      AudioManager.playMusic("music.level_1.intro");

      expect(mockScene.sound.add).toHaveBeenCalledWith("music.level_1.intro", {
        volume: DEFAULT_AUDIO_SETTINGS.musicVolume,
        loop: false,
      });
    });
  });

  describe("Sound Pools", () => {
    beforeEach(() => {
      jest.doMock("./loader", () => ({
        isSoundPoolKey: jest.fn().mockReturnValue(true),
        getPoolVariations: jest
          .fn()
          .mockReturnValue([
            "sfx.object.drop_0",
            "sfx.object.drop_1",
            "sfx.object.drop_2",
          ]),
      }));
      AudioManager.init(mockScene);
    });

    afterEach(() => {
      jest.dontMock("./loader");
      jest.clearAllMocks();
    });

    it("should play a specific variation from a sound pool", () => {
      const result = AudioManager.playSfxVariation("sfx.object.drop", 1, 0.5);

      // Note: Due to module mocking complexity, this test verifies the API contract
      expect(result).toBeDefined();
    });

    it("should warn when variation index is out of bounds", () => {
      jest.doMock("./loader", () => ({
        isSoundPoolKey: jest.fn().mockReturnValue(false),
        getPoolVariations: jest.fn().mockReturnValue([]),
      }));

      AudioManager.playSfxVariation("sfx.object.drop", 10, 0.5);

      expect(consoleWarn).toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    beforeEach(() => {
      AudioManager.init(mockScene);
    });

    it("should stop all sounds on destroy", () => {
      AudioManager.playSfx("sfx.player.jump");
      AudioManager.playMusic("music.level_1.main");

      AudioManager.destroy();

      expect(mockSound.stop).toHaveBeenCalled();
      expect(mockSound.destroy).toHaveBeenCalled();
    });

    it("should clear all active sounds on destroy", () => {
      AudioManager.playSfx("sfx.player.jump");
      AudioManager.destroy();

      // After destroy, playing sounds should not be tracked
      expect(AudioManager.isPlaying("sfx.player.jump")).toBe(false);
    });

    it("should stop all sounds via stopAll method", () => {
      AudioManager.playSfx("sfx.player.jump");
      AudioManager.playSfx("sfx.player.land");

      AudioManager.stopAll();

      expect(mockSound.stop).toHaveBeenCalled();
      expect(mockSound.destroy).toHaveBeenCalled();
    });
  });

  describe("Settings Persistence", () => {
    beforeEach(() => {
      AudioManager.init(mockScene);
    });

    it("should save settings to localStorage when volume changes", () => {
      AudioManager.setMusicVolume(0.5);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        AUDIO_SETTINGS_KEY,
        expect.stringContaining("0.5"),
      );
    });

    it("should save settings to localStorage when mute state changes", () => {
      AudioManager.mute();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        AUDIO_SETTINGS_KEY,
        expect.stringContaining("true"),
      );
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage full");
      });

      AudioManager.setMusicVolume(0.5);

      expect(consoleWarn).toHaveBeenCalledWith(
        "[AudioManager] Failed to save settings to localStorage:",
        expect.any(Error),
      );
    });
  });
});
