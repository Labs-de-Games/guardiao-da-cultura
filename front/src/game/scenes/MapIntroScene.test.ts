import { SceneNames } from "@/game/constants/SceneNames";
import { EventBus } from "@/shared/events/event-bus";
import { MapIntroScene } from "./MapIntroScene";

jest.mock("phaser", () => ({
  Scene: class {},
}));

jest.mock("@/shared/events/event-bus", () => ({
  EventBus: {
    emit: jest.fn(),
  },
}));

jest.mock("js-cookie", () => ({
  get: jest.fn(),
  set: jest.fn(),
}));

describe("MapIntroScene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the active map marker when starting the game", () => {
    const scene = new MapIntroScene();
    const cancelAutoStart = jest.fn();
    const sceneStart = jest.fn();

    Object.defineProperty(scene, "activeMarkerIndex", {
      value: 0,
      writable: true,
    });
    // Seed maxUnlockedLevel so level_01 (index 0) is available (1 > 0)
    Object.defineProperty(scene, "maxUnlockedLevel", {
      value: 1,
      writable: true,
    });
    Object.defineProperty(scene, "cancelAutoStart", {
      value: cancelAutoStart,
    });
    Object.defineProperty(scene, "scene", {
      value: { start: sceneStart },
    });

    (scene as any).beginGame("spacebar");

    expect(cancelAutoStart).toHaveBeenCalledWith("started");
    expect(EventBus.emit).not.toHaveBeenCalledWith("map:marker-changed", null);
    expect(sceneStart).toHaveBeenCalledWith(SceneNames.LEVEL_CINEMATIC, {
      levelId: "level_01",
    });
  });
});
