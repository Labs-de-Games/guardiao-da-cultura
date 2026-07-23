import { act, renderHook } from "@testing-library/react";

const mockSpeak = jest.fn().mockResolvedValue(undefined);
const mockStop = jest.fn();
const mockIsPlaying = jest.fn().mockReturnValue(false);

jest.mock("./AudioAccessibilityService", () => ({
  AudioAccessibilityService: {
    speak: (...args: unknown[]) => mockSpeak(...args),
    stop: (...args: unknown[]) => mockStop(...args),
    isPlaying: (...args: unknown[]) => mockIsPlaying(...args),
  },
}));

import { useAudioAccessibility } from "./useAudioAccessibility";

describe("useAudioAccessibility", () => {
  beforeEach(() => {
    mockSpeak.mockReset();
    mockSpeak.mockResolvedValue(undefined);
    mockStop.mockReset();
    mockIsPlaying.mockReset();
    mockIsPlaying.mockReturnValue(false);
  });

  it("returns speak, stop, and isSpeaking", () => {
    const { result } = renderHook(() => useAudioAccessibility());

    expect(typeof result.current.speak).toBe("function");
    expect(typeof result.current.stop).toBe("function");
    expect(typeof result.current.isSpeaking).toBe("boolean");
  });

  it("isSpeaking starts as false", () => {
    const { result } = renderHook(() => useAudioAccessibility());

    expect(result.current.isSpeaking).toBe(false);
  });

  it("sets isSpeaking to true during speak(), then false after", async () => {
    let resolveSpeak: () => void;
    mockSpeak.mockImplementation(
      () => new Promise<void>((r) => (resolveSpeak = r)),
    );

    const { result } = renderHook(() => useAudioAccessibility());

    act(() => {
      result.current.speak("hello");
    });

    expect(result.current.isSpeaking).toBe(true);

    await act(async () => {
      resolveSpeak?.();
      await mockSpeak.mock.results[0].value;
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("sets isSpeaking to false on speak() error", async () => {
    mockSpeak.mockRejectedValueOnce(new Error("fail"));

    const { result } = renderHook(() => useAudioAccessibility());

    await act(async () => {
      result.current.speak("hello").catch(() => {});
    });

    expect(result.current.isSpeaking).toBe(false);
  });

  it("stop() sets isSpeaking to false", async () => {
    let resolveSpeak: () => void;
    mockSpeak.mockImplementation(
      () => new Promise<void>((r) => (resolveSpeak = r)),
    );

    const { result } = renderHook(() => useAudioAccessibility());

    act(() => {
      result.current.speak("hello");
    });

    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(result.current.isSpeaking).toBe(false);
    expect(mockStop).toHaveBeenCalled();

    await act(async () => {
      resolveSpeak?.();
    });
  });

  it("cleans up on unmount — calls stop() if playing", () => {
    mockIsPlaying.mockReturnValue(true);

    const { unmount } = renderHook(() => useAudioAccessibility());

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it("does not call stop() on unmount when not playing", () => {
    mockIsPlaying.mockReturnValue(false);

    const { unmount } = renderHook(() => useAudioAccessibility());

    unmount();

    expect(mockStop).not.toHaveBeenCalled();
  });
});
