import { resolve } from "node:path";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../.env") });

import "@testing-library/jest-dom";

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
