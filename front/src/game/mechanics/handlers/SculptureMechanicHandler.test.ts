import { GameEvents } from "../../constants/GameEvents";
import { MissionIds, MissionKeys } from "../../constants/MissionConstants";
import type { Game } from "../../scenes/Game";
import type { PlaceholderInstance } from "../../systems/PlaceholderSystem";
import { SculptureMechanicHandler } from "./SculptureMechanicHandler";

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
          SCULPTURE: {
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
    time: {
      delayedCall: jest.fn((_ms: number, cb: () => void) => cb()),
    },
    ...overrides,
  } as unknown as Game;
}

describe("SculptureMechanicHandler", () => {
  let handler: SculptureMechanicHandler;

  beforeEach(() => {
    handler = new SculptureMechanicHandler(1);
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

      expect(game.events.emit).toHaveBeenCalledWith(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        ["Sucesso!"],
      );
    });

    it("does not complete floor when category not complete", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { snapped: true });

      expect(game.completeFloor).not.toHaveBeenCalled();
    });

    it("completes floor with index 1 when category complete", () => {
      const game = createMockGame({
        placeholderSystem: {
          checkCategoryCompletion: jest.fn().mockReturnValue(true),
        },
      });
      handler.handleDropResult(game, { snapped: true });

      expect(game.completeFloor).toHaveBeenCalledWith(1);
      expect(game.events.emit).toHaveBeenCalledWith(GameEvents.INFO_COLLECTED, {
        missionId: MissionIds.CURATOR,
        infoKey: MissionKeys.SCULPTURES_DONE,
      });
    });

    it("uses fallback dialogue when SYSTEM_DIALOGUES has no SCULPTURE key", () => {
      const game = createMockGame({
        contentData: {
          messages: { SYSTEM_DIALOGUES: {} },
        },
      });
      handler.handleDropResult(game, { snapped: true });

      expect(game.events.emit).toHaveBeenCalledWith(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        ["Excelente! Obra posicionada."],
      );
    });
  });

  describe("handleDropResult — mismatch", () => {
    it("records floor error with correct index", () => {
      const game = createMockGame();
      handler.handleDropResult(game, { mismatch: true });

      expect(game.recordFloorError).toHaveBeenCalledWith(1);
    });

    it("emits educational feedback when available", () => {
      const game = createMockGame({
        contentData: {
          messages: { SYSTEM_DIALOGUES: {} },
          works: {
            SCULPTURES: {
              "sculpture-1": {
                id: "sculpture-1",
                educational: { feedbackError: "Lugar errado!" },
              },
            },
          },
        },
      });
      const placeholder = { id: "sculpture-1" } as PlaceholderInstance;
      handler.handleDropResult(game, { mismatch: true, placeholder });

      expect(game.events.emit).toHaveBeenCalledWith(
        GameEvents.SHOW_DIALOGUE_REQUEST,
        ["Lugar errado!"],
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
