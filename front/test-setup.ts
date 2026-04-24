import { mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

mock.module("phaser", () => {
  return {
    Game: class {
      destroy() {}
    },
    AUTO: 0,
    Scale: {
      RESIZE: 0,
      CENTER_BOTH: 1,
    },
  };
});
