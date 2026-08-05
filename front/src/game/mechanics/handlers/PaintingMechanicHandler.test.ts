import { GameEvents } from "../../constants/GameEvents";
import { MissionIds, MissionKeys } from "../../constants/MissionConstants";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import { PaintingMechanicHandler } from "./PaintingMechanicHandler";

function createMockGame(overrides: Record<string, unknown> = {}): Game {
  return {
    registry: {
      get: jest.fn().mockReturnValue(0),
      set: jest.fn(),
    },
    events: {
      emit: jest.fn(),
    },
    contentData: {
      messages: {
        SYSTEM_DIALOGUES: {
          PAINTING: {
            SUCCESS: ["Sucesso!"],
            ERROR: ["Erro!"],
          },
        },
      },
    },
    placeholderSystem: {
      checkCategoryCompletion: jest.fn().mockReturnValue(false),
    },
    questManager: {
      getRequiredInfos: jest.fn().mockReturnValue([{ infoKey: "a" }]),
      getCollectedInfos: jest.fn().mockReturnValue([]),
    },
    getMissionStepProgress: jest
      .fn()
      .mockReturnValue([{ filled: 1, total: 3 }]),
    completeFloor: jest.fn(),
    recordFloorError: jest.fn(),
    markFloorStarted: jest.fn().mockReturnValue(true),
    getLevelId: jest.fn().mockReturnValue("level_01"),
    shakeHorizontal: jest.fn(),
    time: {
      delayedCall: jest.fn((_ms: number, cb: () => void) => cb()),
    },
    ...overrides,
  } as unknown as Game;
}

describe("PaintingMechanicHandler", () => {
  let handler: PaintingMechanicHandler;

  beforeEach(() => {
    handler = new PaintingMechanicHandler(0);
    jest.clearAllMocks();
  });

  describe("handleDropResult — snapped", () => {
    it("increments flawless counter", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { snapped: true });

      expect(game.registry.set).toHaveBeenCalledWith(
        "puzzles_solved_flawlessly",
        1,
      );
    });

    it("emits success dialogue", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { snapped: true });
    });

    it("emits mission progress changed", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { snapped: true });

      expect(game.events.emit).toHaveBeenCalledWith(
        GameEvents.MISSION_PROGRESS_CHANGED,
      );
    });

    it("does not complete floor when category not complete", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { snapped: true });

      expect(game.completeFloor).not.toHaveBeenCalled();
    });

    it("completes floor and emits INFO_COLLECTED when category complete", () => {
      const game = createMockGame({
        placeholderSystem: {
          checkCategoryCompletion: jest.fn().mockReturnValue(true),
        },
      });
      handler.handleDropResult(game, { snapped: true });

      expect(game.completeFloor).toHaveBeenCalledWith(0);
      expect(game.events.emit).toHaveBeenCalledWith(GameEvents.INFO_COLLECTED, {
        missionId: MissionIds.CURATOR,
        infoKey: MissionKeys.PAINTINGS_DONE,
      });
    });

    it("uses fallback dialogue when SYSTEM_DIALOGUES has no PAINTING key", () => {
      const game = createMockGame({
        contentData: {
          messages: { SYSTEM_DIALOGUES: {} },
        },
      });
      handler.handleDropResult(game, { snapped: true });
    });
  });

  describe("handleDropResult — mismatch", () => {
    it("records floor error", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { mismatch: true });

      expect(game.recordFloorError).toHaveBeenCalledWith(0);
    });

    it("emits educational feedback when available", () => {
      const game = createMockGame({
        contentData: {
          messages: { SYSTEM_DIALOGUES: {} },
          works: {
            PAINTINGS: {
              "work-1": {
                id: "work-1",
                educational: { feedbackError: "Tente novamente!" },
              },
            },
          },
        },
      });
      const placeholder = { id: "work-1" } as PlaceholderInstance;
      handler.handleDropResult(game, { mismatch: true, placeholder });

      expect(game.events.emit).toHaveBeenCalledWith(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        ["Tente novamente!"],
      );
    });

    it("emits fallback error dialogue when no educational feedback", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { mismatch: true });

      expect(game.events.emit).toHaveBeenCalledWith(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        ["Erro!"],
      );
    });
  });
});
