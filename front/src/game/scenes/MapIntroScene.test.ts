import { isLevelEnabled } from "@/game/constants/FeatureFlags";
import { SceneNames } from "@/game/constants/SceneNames";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
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

jest.mock("@/game/constants/FeatureFlags", () => ({
  isLevelEnabled: jest.fn(() => true),
}));

describe("MapIntroScene", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isLevelEnabled as jest.Mock).mockImplementation(() => true);
    useGameUIStore.setState({
      levelTransitionActive: false,
      creditsOpen: false,
    });
  });

  function buildStartableScene() {
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
    Object.defineProperty(scene, "cancelAutoStart", { value: cancelAutoStart });
    Object.defineProperty(scene, "scene", { value: { start: sceneStart } });

    return { scene, cancelAutoStart, sceneStart };
  }

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

  it("flags a level transition when starting the game", () => {
    useGameUIStore.setState({ levelTransitionActive: false });

    const scene = new MapIntroScene();

    Object.defineProperty(scene, "activeMarkerIndex", {
      value: 0,
      writable: true,
    });
    Object.defineProperty(scene, "maxUnlockedLevel", {
      value: 1,
      writable: true,
    });
    Object.defineProperty(scene, "cancelAutoStart", { value: jest.fn() });
    Object.defineProperty(scene, "scene", { value: { start: jest.fn() } });

    (scene as any).beginGame("spacebar");

    expect(useGameUIStore.getState().levelTransitionActive).toBe(true);
  });

  it("ignores a start request while the credits screen is open", () => {
    useGameUIStore.setState({ creditsOpen: true });
    const { scene, sceneStart } = buildStartableScene();

    (scene as any).beginGame("spacebar");

    expect(sceneStart).not.toHaveBeenCalled();
    expect(useGameUIStore.getState().levelTransitionActive).toBe(false);
    // The credits screen stays up: only the player closes it.
    expect(useGameUIStore.getState().creditsOpen).toBe(true);
  });

  it("ignores marker cycling while the credits screen is open", () => {
    useGameUIStore.setState({ creditsOpen: true });
    const { scene, cancelAutoStart } = buildStartableScene();

    (scene as any).cycleMarkerForward();
    (scene as any).cycleMarkerBackward();

    expect((scene as any).activeMarkerIndex).toBe(0);
    expect(cancelAutoStart).not.toHaveBeenCalled();
  });

  describe("isMarkerAvailable", () => {
    function buildScene(maxUnlockedLevel: number) {
      const scene = new MapIntroScene();
      Object.defineProperty(scene, "maxUnlockedLevel", {
        value: maxUnlockedLevel,
        writable: true,
      });
      return scene;
    }

    it("unlocks level 02 once the player has completed level 01", () => {
      const scene = buildScene(2);

      expect((scene as any).isMarkerAvailable(1)).toBe(true);
    });

    it("keeps level 02 locked while the player is on level 01", () => {
      const scene = buildScene(1);

      expect((scene as any).isMarkerAvailable(1)).toBe(false);
    });

    it("keeps a disabled level locked even when progression allows it", () => {
      (isLevelEnabled as jest.Mock).mockImplementation(
        (levelId: string) => levelId !== "level_02",
      );
      const scene = buildScene(2);

      expect((scene as any).isMarkerAvailable(1)).toBe(false);
      expect((scene as any).isMarkerAvailable(0)).toBe(true);
    });

    it("unlocks the identification phase once level 03 is completed", () => {
      // Finishing level_03 pushes currentLevel to 4, which is what opens
      // marker index 3 — the suspect identification phase.
      const scene = buildScene(4);

      expect((scene as any).isMarkerAvailable(3)).toBe(true);
    });

    it("keeps the identification phase locked before level 03 is completed", () => {
      const scene = buildScene(3);

      expect((scene as any).isMarkerAvailable(3)).toBe(false);
    });
  });
});
