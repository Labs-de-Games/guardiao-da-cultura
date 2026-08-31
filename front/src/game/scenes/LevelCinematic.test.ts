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
});
