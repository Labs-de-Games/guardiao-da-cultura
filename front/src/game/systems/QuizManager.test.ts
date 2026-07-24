import posthog from "posthog-js";
import { GameEvents } from "../constants/GameEvents";
import { MissionIds } from "../constants/MissionConstants";
import type { ProgressionManager } from "../objects/ProgressionManager";
import { QuestStatus } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { QuizManager } from "./QuizManager";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("../../lib/env", () => ({
  env: { NEXT_PUBLIC_POSTHOG_KEY: "test", NEXT_PUBLIC_POSTHOG_HOST: "test" },
}));

function createMockNpc(
  overrides: Partial<{
    missionId: string;
    quiz: unknown[];
    dialogues: Record<string, string[]>;
    intermediateQuizDialogues: string[];
    spawnPosition: { x: number; y: number } | null;
  }> = {},
) {
  return {
    getMissionId: () => overrides.missionId ?? "curator",
    getQuiz: () => overrides.quiz ?? null,
    getDialogues: () =>
      overrides.dialogues ?? {
        success: ["Boa!"],
        failure: ["Tente novamente."],
      },
    getName: () => "NPC",
    getIntermediateQuizDialogues: () =>
      overrides.intermediateQuizDialogues ?? [],
    getSpawnPosition: () => overrides.spawnPosition ?? null,
    getSpawnPoint: () => overrides.spawnPosition ?? { x: 0, y: 0 },
    showForQuiz: jest.fn(),
    hideAfterQuiz: jest.fn(),
    teleportTo: jest.fn(),
  };
}

describe("QuizManager", () => {
  let registry: Record<string, unknown>;
  let events: { emit: jest.Mock };
  let scoreManager: ScoreManager;
  let questManager: {
    setStatus: jest.Mock;
    setPendingResult: jest.Mock;
    isIntermediateQuizDone: jest.Mock;
    markIntermediateQuizDone: jest.Mock;
    hasCollectedAll: jest.Mock;
    getStatus: jest.Mock;
  };
  let progressionManager: ProgressionManager;
  let badgeSystem: { checkRequirements: jest.Mock };
  let persistenceBridge: {
    submitScore: jest.Mock;
    saveProgress: jest.Mock;
    sendQuizOutcome: jest.Mock;
  };
  let analyticsSystem: { trackLevelEvent: jest.Mock };
  let levelManager: { updateProgress: jest.Mock };
  let context: QuizManager["context"];

  beforeEach(() => {
    const dataStore = new Map<string, unknown>();
    registry = {
      get: (k: string) => dataStore.get(k),
      set: (k: string, v: unknown) => {
        dataStore.set(k, v);
      },
    };

    events = { emit: jest.fn() };

    scoreManager = {
      recordQuizResult: jest.fn(),
      recordIntermediateQuizResult: jest.fn(),
      getPayload: () => ({
        totalQuarters: 10,
        totalStars: 3,
        rating: "A",
        startedAt: new Date(),
        quiz: {
          correctAnswers: 7,
          totalQuestions: 10,
          accuracyPercent: 70,
          quartersEarned: 10,
        },
      }),
    } as unknown as ScoreManager;

    questManager = {
      setStatus: jest.fn(),
      setPendingResult: jest.fn(),
      isIntermediateQuizDone: jest.fn().mockReturnValue(false),
      markIntermediateQuizDone: jest.fn(),
      hasCollectedAll: jest.fn().mockReturnValue(false),
      getStatus: jest.fn().mockReturnValue(QuestStatus.QUIZ_ACTIVE),
    };

    progressionManager = {
      recordQuizResult: jest.fn(),
      recordLevelCompleted: jest.fn(),
      recordIntermediateQuizResult: jest.fn(),
      getState: () => ({ currentLevel: 1, totalStars: 0, completedLevels: {} }),
    } as unknown as ProgressionManager;

    badgeSystem = { checkRequirements: jest.fn() };

    persistenceBridge = {
      submitScore: jest.fn().mockResolvedValue(undefined),
      saveProgress: jest.fn().mockResolvedValue(undefined),
      sendQuizOutcome: jest.fn().mockResolvedValue(undefined),
    };

    analyticsSystem = { trackLevelEvent: jest.fn() };

    levelManager = { updateProgress: jest.fn() };

    const mockNpc = createMockNpc({
      missionId: "sculptor",
      quiz: [{ q: "Pergunta 1?" }],
      dialogues: { success: ["Parabéns!"], failure: ["Falhou."] },
    });

    context = {
      getLevelId: () => "level-1",
      getLevelDef: () =>
        ({
          id: "level-1",
          levelNumber: 1,
          scene: "Game",
          missions: [],
          npcConfigs: [],
          floorMapItems: [],
          requiredStars: 0,
          background: "bg",
        }) as never,
      getRegistry: () => registry as never,
      getNpcs: () => [mockNpc as unknown as Phaser.GameObjects.GameObject],
      getPlayer: () =>
        ({ x: 100, y: 200 }) as unknown as Phaser.Physics.Arcade.Sprite,
      getEvents: () =>
        ({
          emit: events.emit,
        }) as unknown as import("../../shared/events/event-bus").EventBus,
      getContentData: () => ({ intermediateQuizzes: {} }),
    };
  });

  it("should have quizMode none initially", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );
    expect(quizManager.getQuizMode()).toBe("none");
    expect(quizManager.getIsQuizActive()).toBe(false);
  });

  it("should emit error when quiz data is missing", () => {
    const noQuizNpc = createMockNpc({ missionId: "empty", quiz: null });
    const noQuizContext = {
      ...context,
      getNpcs: () => [noQuizNpc as unknown as Phaser.GameObjects.GameObject],
    };

    const quizManager = new QuizManager(
      noQuizContext,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("empty");

    expect(events.emit).toHaveBeenCalledWith(GameEvents.SHOW_DIALOGUE_REQUEST, [
      "[Erro de Sistema] Não há perguntas cadastradas para esta missão.",
    ]);
  });

  it("should show confirmation when NPC exists and quiz has questions", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    expect(events.emit).toHaveBeenCalledWith(
      GameEvents.SHOW_CONFIRMATION_REQUEST,
      "Podemos iniciar o teste?",
      "NPC",
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("should set quizMode to regular when confirmation accepted", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    const onAccept = confirmCall[3];
    onAccept();

    expect(quizManager.getQuizMode()).toBe("regular");
    expect(quizManager.getIsQuizActive()).toBe(true);
  });

  it("should capture quiz_started posthog event when confirmation accepted", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    const onAccept = confirmCall[3];
    onAccept();

    expect(posthog.capture).toHaveBeenCalledWith("quiz_started", {
      level_id: "level-1",
      mission_id: "sculptor",
      total_questions: 1,
      attempt_number: 1,
    });
  });

  it("should reset quiz state on rejection", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    const onReject = confirmCall[4];
    onReject();

    expect(questManager.setStatus).toHaveBeenCalledWith(
      "sculptor",
      QuestStatus.READY_FOR_QUIZ,
    );
    expect(events.emit).toHaveBeenCalledWith(GameEvents.MISSION_STATUS_CHANGED);
  });

  it("should not start intermediate quiz when already done", () => {
    (questManager.isIntermediateQuizDone as jest.Mock).mockReturnValue(true);
    const curatorNpc = createMockNpc({
      missionId: MissionIds.CURATOR,
      intermediateQuizDialogues: ["Explicação"],
    });
    const curatorContext = {
      ...context,
      getNpcs: () => [curatorNpc as unknown as Phaser.GameObjects.GameObject],
      getContentData: () => ({
        intermediateQuizzes: { info_1: [{ q: "Pergunta?" }] },
      }),
    };
    const quizManager = new QuizManager(
      curatorContext,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startIntermediateQuiz("info_1");
    expect(questManager.isIntermediateQuizDone).toHaveBeenCalledWith("info_1");
  });

  it("should emit SHOW_DIALOGUE_REQUEST with explanation lines for intermediate quiz", () => {
    const curatorNpc = createMockNpc({
      missionId: MissionIds.CURATOR,
      intermediateQuizDialogues: ["Linha 1", "Linha 2"],
    });
    const curatorContext = {
      ...context,
      getNpcs: () => [curatorNpc as unknown as Phaser.GameObjects.GameObject],
      getContentData: () => ({
        intermediateQuizzes: { info_1: [{ q: "Pergunta?" }] },
      }),
    };
    const quizManager = new QuizManager(
      curatorContext,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startIntermediateQuiz("info_1");

    expect(events.emit).toHaveBeenCalledWith(
      GameEvents.SHOW_DIALOGUE_REQUEST,
      ["Linha 1", "Linha 2"],
      expect.any(Function),
    );
  });

  it("should emit SHOW_INTERMEDIATE_QUIZ_REQUEST after explanation callback", () => {
    const curatorNpc = createMockNpc({
      missionId: MissionIds.CURATOR,
      intermediateQuizDialogues: ["Explique"],
    });
    const curatorContext = {
      ...context,
      getNpcs: () => [curatorNpc as unknown as Phaser.GameObjects.GameObject],
      getContentData: () => ({
        intermediateQuizzes: { info_1: [{ q: "Pergunta?" }] },
      }),
    };
    const quizManager = new QuizManager(
      curatorContext,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startIntermediateQuiz("info_1");

    const dialogueCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_DIALOGUE_REQUEST,
    );
    const onDialogueEnd = dialogueCall[2];
    onDialogueEnd();

    expect(events.emit).toHaveBeenCalledWith(
      GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
      [{ q: "Pergunta?" }],
      expect.any(Function),
      { quizNumber: null, attemptNumber: 1 },
    );
  });

  it("should emit SHOW_INTERMEDIATE_QUIZ_REQUEST directly when no explanation lines", () => {
    const curatorNpc = createMockNpc({
      missionId: MissionIds.CURATOR,
      intermediateQuizDialogues: [],
    });
    const curatorContext = {
      ...context,
      getNpcs: () => [curatorNpc as unknown as Phaser.GameObjects.GameObject],
      getContentData: () => ({
        intermediateQuizzes: { info_1: [{ q: "Pergunta?" }] },
      }),
    };
    const quizManager = new QuizManager(
      curatorContext,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startIntermediateQuiz("info_1");

    expect(events.emit).toHaveBeenCalledWith(
      GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
      [{ q: "Pergunta?" }],
      expect.any(Function),
      { quizNumber: null, attemptNumber: 1 },
    );
  });

  it("should not emit SHOW_QUIZ_REQUEST for intermediate quiz", () => {
    const curatorNpc = createMockNpc({
      missionId: MissionIds.CURATOR,
      intermediateQuizDialogues: [],
    });
    const curatorContext = {
      ...context,
      getNpcs: () => [curatorNpc as unknown as Phaser.GameObjects.GameObject],
      getContentData: () => ({
        intermediateQuizzes: { info_1: [{ q: "Pergunta?" }] },
      }),
    };
    const quizManager = new QuizManager(
      curatorContext,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startIntermediateQuiz("info_1");

    const quizRequestCalls = events.emit.mock.calls.filter(
      (c: unknown[]) => c[0] === GameEvents.SHOW_QUIZ_REQUEST,
    );
    expect(quizRequestCalls).toHaveLength(0);
  });

  it("should record score when quiz callback fires with passing score", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    confirmCall[3]();

    const quizCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_QUIZ_REQUEST,
    );
    const onComplete = quizCall[3];
    onComplete(7);

    expect(scoreManager.recordQuizResult).toHaveBeenCalledWith(7, 1);
    expect(questManager.setStatus).toHaveBeenCalledWith(
      "sculptor",
      QuestStatus.COMPLETED,
    );
    expect(persistenceBridge.submitScore).toHaveBeenCalled();
    expect(persistenceBridge.saveProgress).toHaveBeenCalled();
    expect(persistenceBridge.sendQuizOutcome).toHaveBeenCalled();
    expect(quizManager.getQuizMode()).toBe("none");
    expect(quizManager.getIsQuizActive()).toBe(false);
  });

  it("should handle failing quiz score", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    confirmCall[3]();

    const quizCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_QUIZ_REQUEST,
    );
    quizCall[3](0);

    expect(questManager.setStatus).toHaveBeenCalledWith(
      "sculptor",
      QuestStatus.READY_FOR_QUIZ,
    );
    expect(persistenceBridge.submitScore).toHaveBeenCalled();
    expect(quizManager.getQuizMode()).toBe("none");
  });

  it("should emit MISSION_STATUS_CHANGED on confirmation rejection", () => {
    const quizManager = new QuizManager(
      context,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );

    quizManager.startQuiz("sculptor");

    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    confirmCall[4]();

    expect(events.emit).toHaveBeenCalledWith(GameEvents.MISSION_STATUS_CHANGED);
  });
});
