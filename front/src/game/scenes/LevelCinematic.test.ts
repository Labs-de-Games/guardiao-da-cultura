import { SceneNames } from "@/game/constants/SceneNames";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { LevelCinematic } from "./LevelCinematic";

// game-ui-store pulls in the EventBus, which needs a working EventEmitter.
jest.mock("phaser", () => ({
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
  Events: { EventEmitter: jest.requireActual("eventemitter3") },
}));

jest.mock("../audio", () => ({
  AudioManager: { init: jest.fn() },
  loadGlobalAudio: jest.fn(),
  loadLevelAudio: jest.fn(),
}));

describe("LevelCinematic", () => {
  beforeEach(() => {
    useGameUIStore.setState({
      levelTransitionActive: false,
      creditsOpen: false,
    });
  });

  it("flags a level transition for every route into a level", () => {
    const scene = new LevelCinematic();

    scene.init({ levelId: "level_02" });

    expect(useGameUIStore.getState().levelTransitionActive).toBe(true);
  });

  it("dismisses an open credits screen when the hand-off starts", () => {
    useGameUIStore.setState({ creditsOpen: true });
    const scene = new LevelCinematic();

    scene.init({ levelId: "level_01" });

    expect(useGameUIStore.getState().creditsOpen).toBe(false);
  });

  describe("transition target", () => {
    function buildScene(levelId: string) {
      const scene = new LevelCinematic();
      const sceneStart = jest.fn();
      scene.init({ levelId });
      Object.defineProperty(scene, "scene", { value: { start: sceneStart } });
      return { scene, sceneStart };
    }

    it("starts the Game scene for a playable level", () => {
      const { scene, sceneStart } = buildScene("level_02");

      (scene as unknown as { transitionToGame(): void }).transitionToGame();

      expect(sceneStart).toHaveBeenCalledWith(SceneNames.GAME, {
        levelId: "level_02",
      });
    });

    it("starts the investigation screen for the identification phase", () => {
      // The identification phase has no tilemap: the cinematic still plays, but
      // it hands off to the investigation screen instead of the Game scene.
      const { scene, sceneStart } = buildScene("level_04");

      (scene as unknown as { transitionToGame(): void }).transitionToGame();

      expect(sceneStart).toHaveBeenCalledWith(SceneNames.INVESTIGATION);
    });
  });
});
