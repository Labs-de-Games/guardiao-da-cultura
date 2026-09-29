/**
 * Cold-start behaviour: no RESPONSIVEVOICE_API_KEY configured, so
 * /api/tts/synthesize answers 503 and narration must fall through to the
 * browser's own speech synthesis.
 *
 * This lives in its own file because the service is a module-level singleton
 * and the "TTS is unavailable" flag is deliberately sticky — once the server
 * has said it has no key, later utterances must not repeat the round trip.
 * A fresh module registry per test file is what keeps that state from leaking
 * into the main suite.
 */

const mockSpeak = jest.fn();
const mockCancel = jest.fn();
let mockUtteranceOnend: (() => void) | null = null;

class MockSpeechSynthesisUtterance {
  lang = "";
  volume = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

Object.defineProperty(window, "speechSynthesis", {
  value: {
    speak: mockSpeak.mockImplementation(
      (utterance: MockSpeechSynthesisUtterance) => {
        mockUtteranceOnend = utterance.onend;
      },
    ),
    cancel: mockCancel,
    speaking: false,
  },
  writable: true,
});

(globalThis as Record<string, unknown>).SpeechSynthesisUtterance =
  MockSpeechSynthesisUtterance;

class MockAudio {
  play() {
    return Promise.resolve();
  }
  pause() {}
}
(globalThis as Record<string, unknown>).Audio = MockAudio;

const mockFetch = jest.fn();
(globalThis as Record<string, unknown>).fetch = mockFetch;

jest.spyOn(console, "error").mockImplementation(() => {});

import { AudioAccessibilityService as service } from "./AudioAccessibilityService";

function flushPromises() {
  return new Promise((r) => setTimeout(r, 0));
}

function unavailableResponse() {
  return {
    ok: false,
    status: 503,
    blob: jest.fn(),
  };
}

describe("AudioAccessibilityService without a ResponsiveVoice key", () => {
  beforeEach(() => {
    mockSpeak.mockClear();
    mockCancel.mockClear();
    mockUtteranceOnend = null;
  });

  it("narrates with the browser voice when the route reports 503", async () => {
    mockFetch.mockResolvedValueOnce(unavailableResponse());

    const promise = service.speak("primeira fala");
    await flushPromises();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockSpeak).toHaveBeenCalled();

    mockUtteranceOnend?.();
    await expect(promise).resolves.toBeUndefined();
  });

  it("stops calling the route once it has reported itself unavailable", async () => {
    mockFetch.mockClear();

    const promise = service.speak("segunda fala");
    await flushPromises();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();

    mockUtteranceOnend?.();
    await expect(promise).resolves.toBeUndefined();
  });
});
