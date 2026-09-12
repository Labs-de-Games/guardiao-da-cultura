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
jest.mock("../../lib/analyticsApi", () => ({
  sendGameEvent: jest.fn().mockResolvedValue(undefined),
}));
// QuizManager.ts does not actually import "../../lib/env" — this mock was
// long inert (and using a stale flat shape besides). Kept only as a guard:
// if QuizManager ever starts importing env, the shape below must match the
// real module's {client: …} export or this file's own guard test below
// (which imports the *real*, unmocked module) will fail loudly instead of
// silently running against a wrong mock.
jest.mock("../../lib/env", () => ({
  env: { client: { env: "test" } },
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
    prependName: (lines: string[]) => lines.map((line) => `NPC: ${line}`),
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
      quiz: [{ question: "Pergunta 1?", options: ["A", "B", "C", "D"] }],
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
          activeMissions: [MissionIds.CURATOR],
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

    // Issue #741's third critical_error_occurred hook: missing quiz data
    // blocks the player on this mission.
    expect(posthog.capture).toHaveBeenCalledWith(
      "critical_error_occurred",
      expect.objectContaining({
        error_code: "quiz_data_missing",
        is_blocking: true,
        mission_id: "empty",
      }),
    );
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
      undefined,
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

  it("should reset quest status to READY_FOR_QUIZ on dismiss (Esc)", () => {
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
    const onDismiss = confirmCall[6];
    onDismiss();

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
        intermediateQuizzes: {
          info_1: [{ question: "Pergunta?", options: ["A", "B", "C", "D"] }],
        },
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
        intermediateQuizzes: {
          info_1: [{ question: "Pergunta?", options: ["A", "B", "C", "D"] }],
        },
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
      ["NPC: Linha 1", "NPC: Linha 2"],
      expect.any(Function),
      expect.any(Object),
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
        intermediateQuizzes: {
          info_1: [{ question: "Pergunta?", options: ["A", "B", "C", "D"] }],
        },
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
      expect.arrayContaining([
        expect.objectContaining({
          question: "Pergunta?",
          options: expect.arrayContaining(["A", "B", "C", "D"]),
          correctOptionIndex: expect.any(Number),
        }),
      ]),
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
        intermediateQuizzes: {
          info_1: [{ question: "Pergunta?", options: ["A", "B", "C", "D"] }],
        },
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
      expect.arrayContaining([
        expect.objectContaining({
          question: "Pergunta?",
          options: expect.arrayContaining(["A", "B", "C", "D"]),
          correctOptionIndex: expect.any(Number),
        }),
      ]),
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
        intermediateQuizzes: {
          info_1: [{ question: "Pergunta?", options: ["A", "B", "C", "D"] }],
        },
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

  function setupFiveQuestionQuiz(overrides: { missionId?: string } = {}) {
    const fiveQuestions = Array.from({ length: 5 }, (_, i) => ({
      question: `Pergunta ${i + 1}?`,
      options: ["A", "B", "C", "D"],
    }));
    const npc = createMockNpc({
      missionId: overrides.missionId ?? "sculptor",
      quiz: fiveQuestions,
      dialogues: { success: ["Parabéns!"], failure: ["Falhou."] },
    });
    const ctx = {
      ...context,
      getNpcs: () => [npc as unknown as Phaser.GameObjects.GameObject],
    };
    const qm = new QuizManager(
      ctx,
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );
    return { quizManager: qm, npc };
  }

  function acceptQuizAndGetCallback(qm: QuizManager) {
    qm.startQuiz("sculptor");
    const confirmCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_CONFIRMATION_REQUEST,
    );
    confirmCall[3]();
    const quizCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_QUIZ_REQUEST,
    );
    return quizCall[3] as (score: number) => void;
  }

  it("should pass when score meets threshold (3/5 with 0.5)", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(3);

    expect(scoreManager.recordQuizResult).toHaveBeenCalledWith(3, 5);
    expect(questManager.setStatus).toHaveBeenCalledWith(
      "sculptor",
      QuestStatus.COMPLETED,
    );
  });

  it("emits quiz_completed before chapter_1_completed, matching the acceptance-criteria funnel order (#741)", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(3);

    const calls = (posthog.capture as jest.Mock).mock.calls.map(
      ([eventName]) => eventName,
    );
    const quizCompletedIndex = calls.indexOf("quiz_completed");
    const chapter1CompletedIndex = calls.indexOf("chapter_1_completed");

    expect(quizCompletedIndex).toBeGreaterThanOrEqual(0);
    expect(chapter1CompletedIndex).toBeGreaterThan(quizCompletedIndex);
  });

  it("captures quiz_completed with quiz_result and duration_seconds on success (#741)", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(3);

    expect(posthog.capture).toHaveBeenCalledWith(
      "quiz_completed",
      expect.objectContaining({
        quiz_result: "passed",
        duration_seconds: expect.any(Number),
      }),
    );
  });

  it("captures quiz_completed with quiz_result: failed on a failing score (#741)", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(1);

    expect(posthog.capture).toHaveBeenCalledWith(
      "quiz_completed",
      expect.objectContaining({ quiz_result: "failed" }),
    );
  });

  it("captures the canonical chapter_1_completed on a level-1 success (getLevelDef fixture is levelNumber: 1)", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(3);

    expect(posthog.capture).toHaveBeenCalledWith(
      "chapter_1_completed",
      expect.objectContaining({
        level_id: context.getLevelId(),
        score: expect.any(Number),
        stars: expect.any(Number),
        duration_seconds: expect.any(Number),
      }),
    );
  });

  it("does not capture chapter_1_completed for a level-2 success", () => {
    const level2Context = {
      ...context,
      getLevelDef: () => ({
        ...context.getLevelDef(),
        levelNumber: 2,
      }),
    };
    const npc = createMockNpc({
      missionId: "sculptor",
      quiz: Array.from({ length: 5 }, (_, i) => ({
        question: `Pergunta ${i + 1}?`,
        options: ["A", "B", "C", "D"],
      })),
      dialogues: { success: ["Parabéns!"], failure: ["Falhou."] },
    });
    const qm = new QuizManager(
      {
        ...level2Context,
        getNpcs: () => [npc as unknown as Phaser.GameObjects.GameObject],
      },
      scoreManager,
      questManager as never,
      progressionManager,
      badgeSystem as never,
      persistenceBridge as never,
      analyticsSystem as never,
      levelManager as never,
    );
    const onComplete = acceptQuizAndGetCallback(qm);

    (posthog.capture as jest.Mock).mockClear();
    onComplete(3);

    expect(posthog.capture).not.toHaveBeenCalledWith(
      "chapter_1_completed",
      expect.anything(),
    );
  });

  it("should fail when score is below threshold (2/5 with 0.5)", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(2);

    expect(questManager.setStatus).toHaveBeenCalledWith(
      "sculptor",
      QuestStatus.READY_FOR_QUIZ,
    );
    expect(registry.get("has_failed_quiz")).toBe(1);
  });

  it("should set quiz_perfect_score badge on 5/5", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(5);

    expect(registry.get("quiz_perfect_score")).toBe(1);
    expect(badgeSystem.checkRequirements).toHaveBeenCalledWith(
      "quiz_perfect_score",
      1,
    );
  });

  it("should set quiz_solved_after_failure badge when passing after previous failure", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(2);
    expect(registry.get("has_failed_quiz")).toBe(1);

    jest.clearAllMocks();
    events.emit.mockClear();

    const onComplete2 = acceptQuizAndGetCallback(qm);
    onComplete2(4);

    expect(registry.get("quiz_solved_after_failure")).toBe(1);
    expect(badgeSystem.checkRequirements).toHaveBeenCalledWith(
      "quiz_solved_after_failure",
      1,
    );
  });

  it("should pass correct score and total to scoreManager", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(4);

    expect(scoreManager.recordQuizResult).toHaveBeenCalledWith(4, 5);
  });

  it("should increment attempt number on second quiz attempt", () => {
    const { quizManager: qm } = setupFiveQuestionQuiz();
    const onComplete = acceptQuizAndGetCallback(qm);

    onComplete(2);

    jest.clearAllMocks();
    events.emit.mockClear();

    const onComplete2 = acceptQuizAndGetCallback(qm);
    onComplete2(4);

    const secondQuizCall = events.emit.mock.calls.find(
      (c: unknown[]) => c[0] === GameEvents.SHOW_QUIZ_REQUEST,
    );
    expect(secondQuizCall[4]).toEqual({
      quizNumber: null,
      attemptNumber: 2,
    });
  });
});

describe("../../lib/env mock guard", () => {
  it("real module still exports {client: …} — update the mock above if this fails", () => {
    const realEnv = jest.requireActual<{
      env: { client: Record<string, unknown> };
    }>("../../lib/env");
    expect(realEnv.env).toHaveProperty("client");
    expect(typeof realEnv.env.client).toBe("object");
  });
});
