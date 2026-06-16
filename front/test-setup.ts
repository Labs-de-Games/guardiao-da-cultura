import "@testing-library/jest-dom";

jest.mock("phaser", () => ({
  Game: class {
    destroy() {}
  },
  AUTO: 0,
  Scale: {
    RESIZE: 0,
    CENTER_BOTH: 1,
  },
  Events: {
    EventEmitter: class {
      on = jest.fn();
      off = jest.fn();
      once = jest.fn();
      emit = jest.fn();
      removeAllListeners = jest.fn();
    },
  },
}));
