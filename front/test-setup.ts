import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env") });

/**
 * Force the test suite into "development" mode, after the optional .env
 * load above so it wins regardless of what a developer has locally.
 *
 * `env.ts`'s client schema defaults `NEXT_PUBLIC_ENV` to "production" when
 * unset, and `env-server.ts` then requires AUTH_SECRET/AUTH_GOOGLE_ID/
 * AUTH_GOOGLE_SECRET/AUTH_TRUST_HOST outside development (a deliberate
 * boot-time guard for staging/production). CI checks out the repo with no
 * .env file and sets no env vars, so every test that reaches `serverEnv`
 * — even one only reading the query cache TTL — threw a ZodError instead
 * of running. Setting this here keeps that production guard intact while
 * making test runs deterministic across CI and local machines.
 */
process.env.NEXT_PUBLIC_ENV = "development";

/**
 * Same class of problem: `env-server.ts:7` requires RESPONSIVEVOICE_API_KEY
 * unconditionally (`z.string().min(1)`). No test suite asserts a missing key
 * (they set their own), but any test that reaches the real `serverEnv.server`
 * without setting it threw a ZodError on CI — which has no .env — while
 * passing locally only because a developer's .env supplied the key. Default it
 * here so the whole suite is deterministic with zero env vars, like CI.
 */
process.env.RESPONSIVEVOICE_API_KEY ??= "test-key";

import "@testing-library/jest-dom";

// embla-carousel relies on ResizeObserver / IntersectionObserver / matchMedia,
// none of which jsdom implements — stub them so mounting doesn't throw.
class MockResizeObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

class MockIntersectionObserver {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// jsdom does not implement HTMLMediaElement playback — the step-sequence panel
// calls play() on its choreography video.
if (typeof window !== "undefined") {
  window.HTMLMediaElement.prototype.play = jest
    .fn()
    .mockResolvedValue(undefined);
}

class MockEventEmitter {
  on = jest.fn();
  off = jest.fn();
  once = jest.fn();
  emit = jest.fn();
  removeAllListeners = jest.fn();
}

jest.mock("phaser", () => ({
  Game: class {
    destroy() {}
  },
  AUTO: 0,
  Scale: {
    RESIZE: 0,
    CENTER_BOTH: 1,
  },
  Data: {
    DataManager: class {
      private data: Record<string, unknown> = {};
      get(key: string) {
        return this.data[key];
      }
      set(key: string, value: unknown) {
        this.data[key] = value;
      }
    },
  },
  Events: {
    EventEmitter: MockEventEmitter,
  },
  Sound: {
    Events: {
      COMPLETE: "complete",
    },
  },
}));
