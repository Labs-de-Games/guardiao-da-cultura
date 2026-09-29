import Cookies from "js-cookie";
import posthog from "posthog-js";
import {
  INVESTIGATION_LEVEL_ID,
  INVESTIGATION_LEVEL_NUMBER,
  INVESTIGATION_MUSIC_VOLUME,
} from "@/game/constants/Investigation";
import { SceneNames } from "@/game/constants/SceneNames";
import { createGamePersistence } from "@/lib/persistence/gamePersistence";
import { EventBus } from "@/shared/events/event-bus";
import { AudioManager } from "../audio";
import type { InvestigationPayload } from "../types/InvestigationTypes";
import type { UserProgressState } from "../types/ProgressionTypes";
import { InvestigationScene } from "./InvestigationScene";

jest.mock("phaser", () => ({
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: "shutdown" } },
  Events: { EventEmitter: jest.requireActual("eventemitter3") },
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

jest.mock("js-cookie", () => ({
  __esModule: true,
  default: { get: jest.fn(), set: jest.fn() },
}));

jest.mock("@/lib/persistence/gamePersistence", () => ({
  createGamePersistence: jest.fn(),
}));

jest.mock("../audio", () => ({
  AudioManager: { init: jest.fn(), setMusicVolume: jest.fn() },
  loadGlobalAudio: jest.fn(),
}));

const SUSPECTS = {
  suspects: [
    {
      id: "augusto_vale",
      name: "Augusto Vale",
      role: "Restaurador",
      relationWithCulture: "rel",
      profile: "profile",
      isCulprit: true,
      traits: { conservation_technique: true },
    },
    {
      id: "helena_marques",
      name: "Helena Marques",
      role: "Curadora",
      relationWithCulture: "rel",
      profile: "profile",
      isCulprit: false,
      traits: { conservation_technique: false },
    },
  ],
};

// Mirrors the shipped correlation file: two clues per level.
const CLUE_LINKS = {
  traits: [
    { id: "conservation_technique", label: "Domínio técnico" },
    { id: "smokes", label: "Fuma cachimbo" },
  ],
  clues: [
    { levelId: "level_01", clueId: "paper", traitId: "conservation_technique" },
    {
      levelId: "level_01",
      clueId: "varnish",
      traitId: "conservation_technique",
    },
    {
      levelId: "level_02",
      clueId: "document",
      traitId: "conservation_technique",
    },
    { levelId: "level_02", clueId: "cachimbo", traitId: "smokes" },
    {
      levelId: "level_03",
      clueId: "signature",
      traitId: "conservation_technique",
    },
    {
      levelId: "level_03",
      clueId: "itinerary",
      traitId: "conservation_technique",
    },
    // Present in the correlation file but absent from level content: must be
    // skipped rather than rendered as an empty card.
    { levelId: "level_03", clueId: "ghost", traitId: "conservation_technique" },
  ],
};

function collectibleContent(ids: string[]) {
  return {
    collectibles: {
      CLUE_VILLAIN: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            id,
            metadata: { title: `Título ${id}` },
            educational: { description: `Descrição ${id}` },
            assets: { sprite: id },
          },
        ]),
      ),
    },
  };
}

const OUTRO_CONFIG = {
  assetDir: "suspect-arrested",
  skipEnabled: true,
  panels: [{ src: "arrested.png" }, { src: "on-jail.png" }],
};

const CONTENT: Record<string, unknown> = {
  investigation_suspects: SUSPECTS,
  investigation_clues: CLUE_LINKS,
  investigation_outro_config: OUTRO_CONFIG,
  "investigation_collectibles:level_01": collectibleContent([
    "paper",
    "varnish",
  ]),
  "investigation_collectibles:level_02": collectibleContent([
    "document",
    "cachimbo",
  ]),
  "investigation_collectibles:level_03": collectibleContent([
    "signature",
    "itinerary",
  ]),
};

/** Scenes built during a test, torn down afterwards so listeners don't leak. */
const liveScenes: InvestigationScene[] = [];

function buildScene({
  collectedByLevel = {} as Record<string, string[]>,
  progress = null as UserProgressState | null,
} = {}) {
  const saveProgress = jest.fn().mockResolvedValue(undefined);
  const saveScore = jest.fn().mockResolvedValue(undefined);
  const persistence = {
    loadProgress: jest.fn().mockResolvedValue(progress),
    loadCollectibles: jest.fn(async (levelId: string) =>
      (collectedByLevel[levelId] ?? []).map((collectibleId) => ({
        collectibleId,
        collectibleType: "CLUE_VILLAIN" as const,
      })),
    ),
    saveProgress,
    saveScore,
  };
  (createGamePersistence as jest.Mock).mockReturnValue(persistence);

  const scene = new InvestigationScene();
  const sceneStart = jest.fn();

  Object.defineProperty(scene, "cache", {
    value: {
      json: {
        get: (key: string) => CONTENT[key] ?? null,
        exists: () => false,
        remove: jest.fn(),
      },
    },
  });
  Object.defineProperty(scene, "cameras", {
    value: { main: { setBackgroundColor: jest.fn() } },
  });
  Object.defineProperty(scene, "game", {
    value: { registry: { get: jest.fn(() => null) } },
  });
  Object.defineProperty(scene, "scene", { value: { start: sceneStart } });
  Object.defineProperty(scene, "events", { value: { once: jest.fn() } });

  liveScenes.push(scene);

  return { scene, sceneStart, persistence, saveProgress, saveScore };
}

async function captureStartPayload(
  run: () => void,
): Promise<InvestigationPayload> {
  return new Promise((resolve) => {
    const unsub = EventBus.on("investigation:start", (payload) => {
      unsub();
      resolve(payload);
    });
    run();
  });
}

describe("InvestigationScene", () => {
  afterEach(() => {
    // The EventBus is shared, so a scene left listening would also react to the
    // next test's events.
    for (const scene of liveScenes.splice(0)) {
      scene.shutdown();
    }
    jest.clearAllMocks();
  });

  describe("audio", () => {
    it("drops the music to the phase's own level on every entry", () => {
      const { scene } = buildScene();

      scene.create();

      expect(AudioManager.setMusicVolume).toHaveBeenCalledWith(
        INVESTIGATION_MUSIC_VOLUME,
      );
    });
  });

  describe("dossier assembly", () => {
    it("marks collected clues as the player's and skips unknown clue ids", async () => {
      const { scene } = buildScene({
        collectedByLevel: {
          level_01: ["paper", "varnish"],
          level_02: ["document", "cachimbo"],
          level_03: ["signature", "itinerary"],
        },
      });

      const payload = await captureStartPayload(() => scene.create());

      expect(payload.clues).toHaveLength(6);
      expect(payload.collectedCount).toBe(6);
      expect(payload.clues.every((c) => c.source === "player")).toBe(true);
      expect(payload.clues.map((c) => c.clueId)).not.toContain("ghost");
    });

    it("keys clues by level so duplicate clue ids cannot collide", async () => {
      const { scene } = buildScene({
        collectedByLevel: { level_01: ["varnish"] },
      });

      const payload = await captureStartPayload(() => scene.create());

      expect(payload.clues[0].key).toBe("level_01:varnish");
    });

    it("attaches each clue's trait label from the correlation file", async () => {
      const { scene } = buildScene({
        collectedByLevel: { level_01: ["varnish"] },
      });

      const payload = await captureStartPayload(() => scene.create());

      const varnish = payload.clues.find((c) => c.clueId === "varnish");
      expect(varnish?.traitId).toBe("conservation_technique");
      expect(varnish?.traitLabel).toBe("Domínio técnico");
    });

    it("tops the dossier up from the curator's files when too few were collected", async () => {
      const { scene } = buildScene({
        collectedByLevel: { level_01: ["varnish"] },
      });

      const payload = await captureStartPayload(() => scene.create());

      // One collected + three from the curator reaches the four-clue minimum.
      expect(payload.collectedCount).toBe(1);
      expect(payload.clues).toHaveLength(4);
      expect(payload.clues.filter((c) => c.source === "curator")).toHaveLength(
        3,
      );
    });

    it("supplies the full baseline when nothing at all was collected", async () => {
      const { scene } = buildScene();

      const payload = await captureStartPayload(() => scene.create());

      expect(payload.collectedCount).toBe(0);
      expect(payload.clues).toHaveLength(4);
      expect(payload.clues.every((c) => c.source === "curator")).toBe(true);
    });

    it("reports the best previous star result", async () => {
      const { scene } = buildScene({
        progress: {
          currentLevel: 4,
          totalStars: 3,
          completedLevels: {
            [INVESTIGATION_LEVEL_ID]: {
              completedAt: "2026-01-01T00:00:00.000Z",
              score: 0,
              stars: 3,
            },
          },
          clues: {},
          quizResults: {},
          intermediateQuizResults: {},
        },
      });

      const payload = await captureStartPayload(() => scene.create());

      expect(payload.previousStars).toBe(3);
    });

    it("reports the opening with level metadata", async () => {
      const { scene } = buildScene();
      await captureStartPayload(() => scene.create());

      expect(posthog.capture).toHaveBeenCalledWith(
        "investigation_opened",
        expect.objectContaining({
          level_id: INVESTIGATION_LEVEL_ID,
          level_number: INVESTIGATION_LEVEL_NUMBER,
        }),
      );
    });
  });

  describe("persisting the result", () => {
    async function completeWith(
      stars: number,
      progress: UserProgressState | null = null,
      { wrongAttempts = 0, correct = true } = {},
    ) {
      const { scene, saveProgress, saveScore } = buildScene({ progress });
      await captureStartPayload(() => scene.create());

      EventBus.emit("investigation:completed", {
        stars,
        wrongAttempts,
        correct,
      });
      // Let the persistence promise chain settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      return { saveProgress, saveScore, scene };
    }

    it("reports the finished game with level metadata", async () => {
      await completeWith(5);

      expect(posthog.capture).toHaveBeenCalledWith("investigation_completed", {
        level_id: INVESTIGATION_LEVEL_ID,
        level_number: INVESTIGATION_LEVEL_NUMBER,
        stars: 5,
        wrong_attempts: 0,
        is_correct: true,
        revealed: false,
      });
    });

    it("reports a revealed ending as a finished game too", async () => {
      await completeWith(1, null, { wrongAttempts: 4, correct: false });

      expect(posthog.capture).toHaveBeenCalledWith(
        "investigation_completed",
        expect.objectContaining({
          stars: 1,
          is_correct: false,
          revealed: true,
        }),
      );
    });

    it("reports the progress update like levels 1–3 do", async () => {
      await completeWith(5);

      expect(posthog.capture).toHaveBeenCalledWith("progress_updated", {
        level_id: INVESTIGATION_LEVEL_ID,
        level_number: INVESTIGATION_LEVEL_NUMBER,
        current_level: 5,
        total_stars: 5,
        completed_levels_count: 1,
      });
    });

    it("submits the score with only the stars filled in", async () => {
      const { saveScore } = await completeWith(4);

      expect(saveScore).toHaveBeenCalledWith({
        levelId: INVESTIGATION_LEVEL_ID,
        totalQuarters: 0,
        totalStars: 4,
        rating: "",
        floors: [],
        quiz: {
          totalQuestions: 0,
          correctAnswers: 0,
          accuracyPercent: 0,
          quartersEarned: 0,
        },
        intermediateQuizzes: { total: 0, passed: 0, quartersEarned: 0 },
        collectedCollectibles: [],
      });
    });

    it("records the result and unlocks the phase on the map", async () => {
      const { saveProgress } = await completeWith(5);

      const state = saveProgress.mock.calls[0][0] as UserProgressState;
      expect(state.completedLevels[INVESTIGATION_LEVEL_ID].stars).toBe(5);
      expect(state.currentLevel).toBe(5);
      expect(Cookies.set).toHaveBeenCalledWith("currentLevel", "5", {
        expires: 365,
      });
    });

    it("keeps the better of the previous and the new result", async () => {
      const previous: UserProgressState = {
        currentLevel: 5,
        totalStars: 5,
        completedLevels: {
          [INVESTIGATION_LEVEL_ID]: {
            completedAt: "2026-01-01T00:00:00.000Z",
            score: 0,
            stars: 5,
          },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      };

      // A worse run must not overwrite a better one.
      const { saveProgress } = await completeWith(2, previous);

      const state = saveProgress.mock.calls[0][0] as UserProgressState;
      expect(state.completedLevels[INVESTIGATION_LEVEL_ID].stars).toBe(5);
    });

    it("improves a previous result when the new run scores higher", async () => {
      const previous: UserProgressState = {
        currentLevel: 5,
        totalStars: 1,
        completedLevels: {
          [INVESTIGATION_LEVEL_ID]: {
            completedAt: "2026-01-01T00:00:00.000Z",
            score: 0,
            stars: 1,
          },
        },
        clues: {},
        quizResults: {},
        intermediateQuizResults: {},
      };

      const { saveProgress } = await completeWith(5, previous);

      const state = saveProgress.mock.calls[0][0] as UserProgressState;
      expect(state.completedLevels[INVESTIGATION_LEVEL_ID].stars).toBe(5);
      expect(state.totalStars).toBe(5);
    });
  });

  it("returns to the map on investigation:exit", async () => {
    const { scene, sceneStart } = buildScene();
    await captureStartPayload(() => scene.create());

    EventBus.emit("investigation:exit", undefined);

    expect(sceneStart).toHaveBeenCalledWith(SceneNames.INTRO);
  });

  describe("the ending", () => {
    /** A run that has been completed before, so the credits are already spent. */
    const replayed: UserProgressState = {
      currentLevel: 4,
      totalStars: 3,
      completedLevels: {
        [INVESTIGATION_LEVEL_ID]: {
          completedAt: "2026-01-01T00:00:00.000Z",
          score: 0,
          stars: 3,
        },
      },
      clues: {},
      quizResults: {},
      intermediateQuizResults: {},
    };

    it("plays the arrest cinematic out of its own folder", async () => {
      const { scene } = buildScene();
      await captureStartPayload(() => scene.create());

      const started = jest.fn();
      EventBus.on("intro:start", started);
      EventBus.emit("investigation:outro", undefined);
      EventBus.off("intro:start", started);

      expect(started).toHaveBeenCalledWith({
        levelId: INVESTIGATION_LEVEL_ID,
        config: OUTRO_CONFIG,
      });
    });

    it("rolls the credits before the map on a first completion", async () => {
      const { scene, sceneStart } = buildScene();
      await captureStartPayload(() => scene.create());

      const creditsOpened = jest.fn();
      EventBus.on("credits:open", creditsOpened);
      EventBus.emit("intro:complete", { levelId: INVESTIGATION_LEVEL_ID });
      EventBus.off("credits:open", creditsOpened);

      expect(creditsOpened).toHaveBeenCalled();
      // The map waits for the crawl, rather than yanking it away.
      expect(sceneStart).not.toHaveBeenCalled();

      EventBus.emit("credits:close", undefined);
      expect(sceneStart).toHaveBeenCalledWith(SceneNames.INTRO);
    });

    it("skips the credits when the phase has been beaten before", async () => {
      const { scene, sceneStart } = buildScene({ progress: replayed });
      await captureStartPayload(() => scene.create());

      const creditsOpened = jest.fn();
      EventBus.on("credits:open", creditsOpened);
      EventBus.emit("intro:complete", { levelId: INVESTIGATION_LEVEL_ID });
      EventBus.off("credits:open", creditsOpened);

      expect(creditsOpened).not.toHaveBeenCalled();
      expect(sceneStart).toHaveBeenCalledWith(SceneNames.INTRO);
    });

    it("ignores an intro that belongs to another level", async () => {
      const { scene, sceneStart } = buildScene();
      await captureStartPayload(() => scene.create());

      EventBus.emit("intro:complete", { levelId: "level_02" });

      expect(sceneStart).not.toHaveBeenCalled();
    });

    it("still reaches the ending when the cinematic config is missing", async () => {
      const { scene, sceneStart } = buildScene({ progress: replayed });
      await captureStartPayload(() => scene.create());
      jest.spyOn(console, "warn").mockImplementation(() => {});

      delete CONTENT.investigation_outro_config;
      try {
        EventBus.emit("investigation:outro", undefined);
      } finally {
        CONTENT.investigation_outro_config = OUTRO_CONFIG;
      }

      expect(sceneStart).toHaveBeenCalledWith(SceneNames.INTRO);
    });
  });
});
