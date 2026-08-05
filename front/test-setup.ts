import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env") });

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
}));
