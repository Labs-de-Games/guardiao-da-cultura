import { LEVEL_ENABLED } from "@/game/constants/FeatureFlags";
import { SceneNames } from "@/game/constants/SceneNames";
import { EventBus } from "@/shared/events/event-bus";
import { useGameUIStore } from "@/ui/state/game-ui-store";
import { UIScene } from "./UIScene";

// The real EventBus drives these tests, so it needs a working EventEmitter.
// Phaser's is eventemitter3; loading all of Phaser in jsdom is not viable.
jest.mock("phaser", () => ({
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
  Events: { EventEmitter: jest.requireActual("eventemitter3") },
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

jest.mock("../audio", () => ({
  AudioManager: { fadeOutMusic: jest.fn() },
}));

function buildScene(currentLevelId = "level_01") {
  const scene = new UIScene();
  const sceneStart = jest.fn();
  const sceneStop = jest.fn();
  const registryRemove = jest.fn();

  Object.defineProperty(scene, "registry", {
    value: {
      get: jest.fn((key: string) =>
        key === "currentLevelId" ? currentLevelId : undefined,
      ),
      remove: registryRemove,
    },
  });
  Object.defineProperty(scene, "scene", {
    value: {
      start: sceneStart,
      stop: sceneStop,
      get: () => ({ events: { emit: jest.fn() } }),
    },
  });

  (scene as any).setupQuizCloseListener();

  return { scene, sceneStart, sceneStop, registryRemove };
}

describe("UIScene quiz navigation", () => {
  let unsubs: Array<() => void>;

  beforeEach(() => {
    jest.clearAllMocks();
    unsubs = [];
    useGameUIStore.getState().resetQuiz();
    useGameUIStore.setState({
      isInterestDialogOpen: false,
      levelTransitionActive: false,
    });
  });

  afterEach(() => {
    for (const unsub of unsubs) {
      unsub();
    }
  });

  function track(scene: UIScene) {
    unsubs.push(() => {
      (scene as any).unsubQuizClose?.();
      (scene as any).unsubQuizRetry?.();
      (scene as any).unsubQuizNextLevel?.();
    });
  }

  it("loads the next level when it is enabled", () => {
    const { scene, sceneStart, sceneStop, registryRemove } =
      buildScene("level_01");
    track(scene);

    EventBus.emit("quiz:next-level", undefined);

    expect(registryRemove).toHaveBeenCalledWith("music_started:level_02");
    expect(sceneStop).toHaveBeenCalledWith(SceneNames.GAME);
    expect(sceneStart).toHaveBeenCalledWith(SceneNames.LEVEL_CINEMATIC, {
      levelId: "level_02",
    });
    expect(useGameUIStore.getState().isInterestDialogOpen).toBe(false);
  });

  it("seeds the next level's info after clearing the previous level's UI", () => {
    const { scene } = buildScene("level_01");
    track(scene);

    useGameUIStore.setState({ gameStarted: true });

    EventBus.emit("quiz:next-level", undefined);

    expect(useGameUIStore.getState().levelInfo).toEqual({
      title: "Teatro Amazonas",
      location: "Manaus, Amazonas",
      shortlocation: "Manaus, AM",
    });
  });

  it("keeps the level transition flagged while handing off to the next level", () => {
    const { scene } = buildScene("level_01");
    track(scene);

    useGameUIStore.setState({
      gameStarted: true,
      levelTransitionActive: true,
    });

    // Nothing on this path may clear the flag, or the map-only UI renders on
    // top of the next level's cinematic load.
    EventBus.emit("quiz:next-level", undefined);

    expect(useGameUIStore.getState().levelTransitionActive).toBe(true);
  });

  it("opens the interest dialog when the next level is disabled", () => {
    const previous = LEVEL_ENABLED.level_03;
    LEVEL_ENABLED.level_03 = false;

    try {
      const { scene, sceneStart, sceneStop } = buildScene("level_02");
      track(scene);

      EventBus.emit("quiz:next-level", undefined);

      expect(useGameUIStore.getState().isInterestDialogOpen).toBe(true);
      expect(sceneStart).not.toHaveBeenCalled();
      expect(sceneStop).not.toHaveBeenCalled();
    } finally {
      LEVEL_ENABLED.level_03 = previous;
    }
  });

  it("opens the interest dialog when the identification phase is disabled", () => {
    const previous = LEVEL_ENABLED.level_04;
    LEVEL_ENABLED.level_04 = false;

    try {
      const { scene, sceneStart, sceneStop } = buildScene("level_03");
      track(scene);

      EventBus.emit("quiz:next-level", undefined);

      expect(useGameUIStore.getState().isInterestDialogOpen).toBe(true);
      expect(sceneStart).not.toHaveBeenCalled();
      expect(sceneStop).not.toHaveBeenCalled();
    } finally {
      LEVEL_ENABLED.level_04 = previous;
    }
  });

  it("hands off to the identification phase after the last level", () => {
    // The phase ships gated, so this turns it on the way a release would
    // rather than assuming the shipped value.
    const previous = LEVEL_ENABLED.level_04;
    LEVEL_ENABLED.level_04 = true;

    try {
      const { scene, sceneStart, sceneStop } = buildScene("level_03");
      track(scene);

      EventBus.emit("quiz:next-level", undefined);

      // It routes through the cinematic like any other phase, so the player
      // gets the same comic intro before the investigation screen.
      expect(sceneStop).toHaveBeenCalledWith(SceneNames.GAME);
      expect(sceneStart).toHaveBeenCalledWith(SceneNames.LEVEL_CINEMATIC, {
        levelId: "level_04",
      });
      expect(useGameUIStore.getState().isInterestDialogOpen).toBe(false);
      expect(useGameUIStore.getState().levelInfo).toEqual({
        title: "Identificação do Suspeito",
        location: "Sala de Investigação",
        shortlocation: "Sala de Investigação",
      });
    } finally {
      LEVEL_ENABLED.level_04 = previous;
    }
  });

  it("always returns to the map on quiz:close", () => {
    const { scene, sceneStart, sceneStop } = buildScene("level_01");
    track(scene);

    EventBus.emit("quiz:close", undefined);

    expect(sceneStop).toHaveBeenCalledWith(SceneNames.GAME);
    expect(sceneStart).toHaveBeenCalledWith(SceneNames.INTRO);
  });
});
