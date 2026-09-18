import Cookies from "js-cookie";
import { INVESTIGATION_LEVEL_ID } from "@/game/constants/Investigation";
import { SceneNames } from "@/game/constants/SceneNames";
import { createGamePersistence } from "@/lib/persistence/gamePersistence";
import { EventBus } from "@/shared/events/event-bus";
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

const CONTENT: Record<string, unknown> = {
  investigation_suspects: SUSPECTS,
  investigation_clues: CLUE_LINKS,
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
  const persistence = {
    loadProgress: jest.fn().mockResolvedValue(progress),
    loadCollectibles: jest.fn(async (levelId: string) =>
      (collectedByLevel[levelId] ?? []).map((collectibleId) => ({
        collectibleId,
        collectibleType: "CLUE_VILLAIN" as const,
      })),
    ),
    saveProgress,
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

  return { scene, sceneStart, persistence, saveProgress };
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
  });

  describe("persisting the result", () => {
    async function completeWith(
      stars: number,
      progress: UserProgressState | null = null,
    ) {
      const { scene, saveProgress } = buildScene({ progress });
      await captureStartPayload(() => scene.create());

      EventBus.emit("investigation:completed", { stars, wrongAttempts: 0 });
      // Let the persistence promise chain settle.
      await new Promise((resolve) => setTimeout(resolve, 0));

      return { saveProgress, scene };
    }

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
});
