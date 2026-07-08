import posthog from "posthog-js";
import { GameEvents } from "../constants/GameEvents";
import {
  FLOOR_COMPLETE_KEYS,
  MissionIds,
  NPC_FLOOR_3_POSITION,
} from "../constants/MissionConstants";
import type { LevelDefinition } from "../data/LevelConfig";
import type { LevelManager } from "../objects/LevelManager";
import type { ProgressionManager } from "../objects/ProgressionManager";
import { type QuestManager, QuestStatus } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { GameEventType } from "../types/AnalyticsTypes";
import type { QuizQuestion } from "../types/GameDataTypes";
import type { QuizResultRecord } from "../types/ProgressionTypes";
import type { AnalyticsSystem } from "./AnalyticsSystem";
import type { BadgeSystem } from "./BadgeSystem";
import type { PersistenceBridge } from "./PersistenceBridge";

export interface QuizManagerContext {
  getLevelId: () => string;
  getLevelDef: () => LevelDefinition;
  getRegistry: () => Phaser.Data.DataManager;
  getNpcs: () => Phaser.GameObjects.GameObject[];
  getPlayer: () => Phaser.Physics.Arcade.Sprite;
  getEvents: () => { emit: (event: string, ...args: unknown[]) => void };
  getContentData: () => {
    intermediateQuizzes?: Record<string, QuizQuestion[]>;
  };
}

interface NpcLike {
  getMissionId(): string;
  getName(): string;
  getQuiz(): unknown[] | null;
  getDialogues(): Record<string, string[]>;
  getIntermediateQuizDialogues(): string[];
  getSpawnPosition(): { x: number; y: number } | null;
  showForQuiz(x: number, y: number): void;
  hideAfterQuiz(): void;
  teleportTo(x: number, y: number): void;
}

export class QuizManager {
  private quizMode: "none" | "regular" | "intermediate" = "none";
  private isQuizActive = false;
  private quizStartedAt: number | null = null;
  private quizAttemptsForMission = 0;

  constructor(
    private readonly context: QuizManagerContext,
    private readonly scoreManager: ScoreManager,
    private readonly questManager: QuestManager,
    private readonly progressionManager: ProgressionManager,
    private readonly badgeSystem: BadgeSystem,
    private readonly persistenceBridge: PersistenceBridge,
    private readonly analyticsSystem: AnalyticsSystem,
    private readonly levelManager: LevelManager,
  ) {}

  getQuizMode(): "none" | "regular" | "intermediate" {
    return this.quizMode;
  }

  getIsQuizActive(): boolean {
    return this.isQuizActive;
  }

  startQuiz(missionId: string) {
    try {
      const npc = this.findNpcByMission(missionId);
      const questions = npc?.getQuiz();

      if (!questions || questions.length === 0) {
        console.error(
          `[QuizManager] Quiz data missing or empty for missionId: ${missionId}`,
        );
        this.context
          .getEvents()
          .emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
            "[Erro de Sistema] Não há perguntas cadastradas para esta missão.",
          ]);
        return;
      }

      const dialogues = npc?.getDialogues();
      const quizQuestionLines = dialogues?.start_quiz_question;
      const rawLine =
        quizQuestionLines && quizQuestionLines.length > 0
          ? quizQuestionLines[0]
          : "Podemos iniciar o teste?";
      const npcName = npc?.getName() || "";

      this.context.getEvents().emit(
        GameEvents.SHOW_CONFIRMATION_REQUEST,
        rawLine,
        npcName,
        () => {
          this.isQuizActive = true;
          this.quizStartedAt = Date.now();
          this.quizAttemptsForMission += 1;
          this.quizMode = "regular";
          this.context
            .getEvents()
            .emit(
              GameEvents.SHOW_QUIZ_REQUEST,
              questions,
              this.scoreManager,
              (score: number) => {
                this.scoreManager.recordQuizResult(score, questions.length);
                const required = Math.ceil(questions.length * 0.7);
                const isSuccess = score >= required;
                console.log(
                  `[QuizManager] Quiz result: score=${score}/${questions.length}, success=${isSuccess}`,
                );

                const levelId = this.context.getLevelId();
                const levelDef = this.context.getLevelDef();
                const registry = this.context.getRegistry();

                if (isSuccess) {
                  if (score === questions.length) {
                    registry.set("quiz_perfect_score", 1);
                    this.badgeSystem.checkRequirements("quiz_perfect_score", 1);
                  }

                  if (registry.get("has_failed_quiz") === 1) {
                    registry.set("quiz_solved_after_failure", 1);
                    this.badgeSystem.checkRequirements(
                      "quiz_solved_after_failure",
                      1,
                    );
                  }

                  const payload = this.scoreManager.getPayload();
                  this.analyticsSystem.trackLevelEvent(
                    GameEventType.LEVEL_COMPLETED,
                    levelId,
                    {
                      levelNumber: levelDef.levelNumber,
                      score: payload.totalQuarters,
                      stars: payload.totalStars,
                      rating: payload.rating,
                      missionId: missionId,
                    },
                  );

                  posthog.capture("level_completed", {
                    level_id: levelId,
                    level_number: levelDef.levelNumber,
                    score: payload.totalQuarters,
                    stars: payload.totalStars,
                    rating: payload.rating,
                    mission_id: missionId,
                    time_spent_ms:
                      Date.now() - new Date(payload.startedAt).getTime(),
                    attempts: registry.get("has_failed_quiz") || 0,
                  });

                  void this.persistenceBridge.submitScore();
                } else {
                  registry.set("has_failed_quiz", 1);
                  posthog.capture("level_failed", {
                    level_id: levelId,
                    level_number: levelDef.levelNumber,
                    mission_id: missionId,
                    score,
                    total_questions: questions.length,
                  });
                  void this.persistenceBridge.submitScore();
                }

                const scoringPayload = this.scoreManager.getPayload();
                posthog.capture("quiz_completed", {
                  level_id: levelId,
                  mission_id: missionId,
                  score,
                  correct_answers: scoringPayload.quiz.correctAnswers,
                  total_questions: questions.length,
                  accuracy_percent: scoringPayload.quiz.accuracyPercent,
                  passed: isSuccess,
                });

                void this.persistenceBridge.sendQuizOutcome({
                  type: isSuccess ? "quiz.completed" : "quiz.failed",
                  metadata: {
                    missionId,
                    score,
                    totalQuestions: questions.length,
                    accuracyPercent: scoringPayload.quiz.accuracyPercent,
                    quartersEarned: scoringPayload.quiz.quartersEarned,
                    passed: isSuccess,
                    payload: scoringPayload as unknown as Record<
                      string,
                      unknown
                    >,
                  },
                  timestamp: new Date().toISOString(),
                });

                const quizResultRecord: QuizResultRecord = {
                  completedAt: new Date().toISOString(),
                  passed: isSuccess,
                  score,
                  totalQuestions: questions.length,
                  accuracyPercent: scoringPayload.quiz.accuracyPercent,
                  quartersEarned: scoringPayload.quiz.quartersEarned,
                  timeSpentMs:
                    this.quizStartedAt !== null
                      ? Date.now() - this.quizStartedAt
                      : null,
                  attempts: this.quizAttemptsForMission,
                  payload: null,
                };

                this.progressionManager.recordQuizResult(
                  missionId,
                  quizResultRecord,
                );

                if (isSuccess) {
                  this.progressionManager.recordLevelCompleted(
                    levelId,
                    levelDef.levelNumber,
                    scoringPayload.totalStars,
                    scoringPayload.totalQuarters,
                    new Date().toISOString(),
                  );
                }

                void this.persistenceBridge.saveProgress();

                const progressState = this.progressionManager.getState();
                posthog.capture("progress_updated", {
                  level_id: levelId,
                  level_number: levelDef.levelNumber,
                  current_level: progressState.currentLevel,
                  total_stars: progressState.totalStars,
                  completed_levels_count: Object.keys(
                    progressState.completedLevels,
                  ).length,
                  mission_id: missionId,
                  passed: isSuccess,
                  score,
                  total_questions: questions.length,
                });

                const quizNpc = this.findNpcByMission(missionId);

                if (!quizNpc) {
                  console.error(
                    `[QuizManager] NPC não encontrado para a missão: ${missionId}`,
                  );
                  return;
                }

                const quizDialogues = quizNpc.getDialogues();
                const lines = isSuccess
                  ? quizDialogues.success
                  : quizDialogues.failure;

                if (isSuccess) {
                  this.questManager.setStatus(missionId, QuestStatus.COMPLETED);
                } else {
                  this.questManager.setStatus(
                    missionId,
                    QuestStatus.READY_FOR_QUIZ,
                  );
                }

                this.context
                  .getEvents()
                  .emit(GameEvents.MISSION_STATUS_CHANGED);
                this.questManager.setPendingResult(missionId, lines);

                if (isSuccess) {
                  this.levelManager.updateProgress();
                }

                this.quizMode = "none";
                this.isQuizActive = false;
              },
            );
        },
        () => {
          this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
          this.context.getEvents().emit(GameEvents.MISSION_STATUS_CHANGED);
        },
      );
    } catch (error) {
      console.error("[QuizManager] Erro fatal ao iniciar Quiz:", error);
      this.context
        .getEvents()
        .emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
          "Ocorreu um erro ao carregar o desafio.",
        ]);
    }
  }

  startIntermediateQuiz(infoKey: string) {
    try {
      const contentData = this.context.getContentData();
      const questions = contentData?.intermediateQuizzes?.[infoKey];
      if (!questions || questions.length === 0) {
        return;
      }

      if (this.questManager.isIntermediateQuizDone(infoKey)) {
        return;
      }

      const npc = this.findCuratorNpc();

      if (!npc) {
        console.warn(
          `[QuizManager] NPC not found for intermediate quiz, infoKey: ${infoKey}`,
        );
        return;
      }

      this.quizMode = "intermediate";

      const spawnPos = npc.getSpawnPosition();
      const playerX = this.context.getPlayer().x;
      const npcX = playerX + 150;
      const npcY = this.context.getPlayer().y;

      npc.showForQuiz(npcX, npcY);

      const onComplete = this.createIntermediateQuizCallback(
        infoKey,
        questions,
        npc,
        spawnPos,
      );

      const explanationLines = npc.getIntermediateQuizDialogues();
      if (explanationLines.length > 0) {
        this.context
          .getEvents()
          .emit(GameEvents.SHOW_DIALOGUE_REQUEST, explanationLines, () => {
            this.context
              .getEvents()
              .emit(
                GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
                questions,
                onComplete,
              );
          });
      } else {
        this.context
          .getEvents()
          .emit(
            GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
            questions,
            onComplete,
          );
      }
    } catch (error) {
      console.error(`[QuizManager] Error starting intermediate quiz: ${error}`);
    }
  }

  private createIntermediateQuizCallback(
    infoKey: string,
    questions: QuizQuestion[],
    npc: NpcLike,
    spawnPos: { x: number; y: number } | null,
  ) {
    return (score: number) => {
      const passed = score > 0;
      this.scoreManager.recordIntermediateQuizResult(infoKey, passed);
      this.questManager.markIntermediateQuizDone(infoKey);

      this.progressionManager.recordIntermediateQuizResult(infoKey, {
        completedAt: new Date().toISOString(),
        passed,
        score,
        totalQuestions: questions.length,
        missionId: MissionIds.CURATOR,
      });

      void this.persistenceBridge.saveProgress();

      const floorCompleted = FLOOR_COMPLETE_KEYS.has(infoKey);

      if (floorCompleted) {
        npc.teleportTo(NPC_FLOOR_3_POSITION.x, NPC_FLOOR_3_POSITION.y);
      } else {
        npc.hideAfterQuiz();
        if (spawnPos) {
          npc.teleportTo(spawnPos.x, spawnPos.y);
        }
      }

      this.quizMode = "none";

      const levelId = this.context.getLevelId();

      posthog.capture("intermediate_quiz_completed", {
        level_id: levelId,
        info_key: infoKey,
        score,
        total_questions: questions.length,
        passed,
      });

      void this.persistenceBridge.sendQuizOutcome({
        type: passed
          ? "intermediate-quiz.completed"
          : "intermediate-quiz.failed",
        metadata: {
          infoKey,
          passed,
          score,
          totalQuestions: questions.length,
          missionId: MissionIds.CURATOR,
        },
        timestamp: new Date().toISOString(),
      });

      if (
        this.questManager.hasCollectedAll(MissionIds.CURATOR) &&
        this.questManager.getStatus(MissionIds.CURATOR) !==
          QuestStatus.READY_FOR_QUIZ &&
        this.questManager.getStatus(MissionIds.CURATOR) !==
          QuestStatus.QUIZ_ACTIVE &&
        this.questManager.getStatus(MissionIds.CURATOR) !==
          QuestStatus.COMPLETED
      ) {
        this.questManager.setStatus(
          MissionIds.CURATOR,
          QuestStatus.READY_FOR_QUIZ,
        );
      }
    };
  }

  private findCuratorNpc(): NpcLike | undefined {
    return this.context
      .getNpcs()
      .find(
        (n) =>
          typeof (n as unknown as NpcLike).getMissionId === "function" &&
          (n as unknown as NpcLike).getMissionId() === MissionIds.CURATOR,
      ) as NpcLike | undefined;
  }

  private findNpcByMission(missionId: string): NpcLike | undefined {
    return this.context
      .getNpcs()
      .find(
        (n) =>
          typeof (n as unknown as NpcLike).getMissionId === "function" &&
          (n as unknown as NpcLike).getMissionId() === missionId,
      ) as NpcLike | undefined;
  }
}
