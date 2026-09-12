import posthog from "posthog-js";
import { sendGameEvent } from "../../lib/analyticsApi";
import { AudioManager } from "../audio";
import { GameEvents } from "../constants/GameEvents";
import {
  FLOOR_COMPLETE_KEYS,
  INTERMEDIATE_QUIZ_NUMBERS,
  MissionIds,
  NPC_FLOOR_3_POSITION,
} from "../constants/MissionConstants";
import { QUIZ_PASS_THRESHOLD } from "../constants/QuizConstants";
import type { LevelDefinition } from "../data/LevelConfig";
import type { LevelManager } from "../objects/LevelManager";
import type { ProgressionManager } from "../objects/ProgressionManager";
import { type QuestManager, QuestStatus } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { GameEventType } from "../types/AnalyticsTypes";
import type { QuizQuestion } from "../types/GameDataTypes";
import type { QuizResultRecord } from "../types/ProgressionTypes";
import { prepareQuizQuestions } from "../utils/shuffleQuiz";
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
  prependName(lines: string[]): string[];
  getSpawnPosition(): { x: number; y: number } | null;
  getFinalPosition(): { x: number; y: number } | null;
  showForQuiz(x: number, y: number): void;
  hideAfterQuiz(): void;
  teleportTo(x: number, y: number): void;
}

export class QuizManager {
  private quizMode: "none" | "regular" | "intermediate" = "none";
  private isQuizActive = false;
  private quizStartedAt: number | null = null;
  private quizAttemptsForMission = 0;
  private pendingIntermediateQuizQuestions: QuizQuestion[] | null = null;
  private pendingIntermediateQuizOnComplete: ((score: number) => void) | null =
    null;

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
      const questions = npc?.getQuiz() as QuizQuestion[] | null;

      if (!questions || questions.length === 0) {
        console.error(
          `[QuizManager] Quiz data missing or empty for missionId: ${missionId}`,
        );
        this.context
          .getEvents()
          .emit(GameEvents.SHOW_DIALOGUE_REQUEST, [
            "[Erro de Sistema] Não há perguntas cadastradas para esta missão.",
          ]);

        // Issue #741's third critical_error_occurred hook: without quiz
        // data the player is stuck on this mission and can't progress —
        // always blocking.
        {
          const criticalMetadata = {
            error_code: "quiz_data_missing",
            is_blocking: true,
            mission_id: missionId,
            level_id: this.context.getLevelId(),
          };
          posthog.capture("critical_error_occurred", criticalMetadata);
          sendGameEvent({
            userId: this.context.getRegistry().get("userId"),
            type: GameEventType.EVENT_LOGGED,
            timestamp: new Date().toISOString(),
            metadata: { severity: "critical", ...criticalMetadata },
          }).catch((err) => {
            console.error(
              "[QuizManager] Failed to log critical_error_occurred:",
              err,
            );
          });
        }
        return;
      }

      const shuffledQuestions = prepareQuizQuestions(questions);

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

          posthog.capture("quiz_started", {
            level_id: this.context.getLevelId(),
            mission_id: missionId,
            total_questions: shuffledQuestions.length,
            attempt_number: this.quizAttemptsForMission,
          });

          this.quizMode = "regular";
          this.context.getEvents().emit(
            GameEvents.SHOW_QUIZ_REQUEST,
            shuffledQuestions,
            this.scoreManager,
            (score: number) => {
              this.scoreManager.recordQuizResult(
                score,
                shuffledQuestions.length,
              );
              const required = Math.ceil(
                shuffledQuestions.length * QUIZ_PASS_THRESHOLD,
              );
              const isSuccess = score >= required;
              console.log(
                `[QuizManager] Quiz result: score=${score}/${shuffledQuestions.length}, success=${isSuccess}`,
              );

              AudioManager.playSfx(
                isSuccess ? "sfx.puzzle.success" : "sfx.puzzle.failure",
              );

              const levelId = this.context.getLevelId();
              const levelDef = this.context.getLevelDef();
              const registry = this.context.getRegistry();

              if (isSuccess) {
                if (score === shuffledQuestions.length) {
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
                  total_questions: shuffledQuestions.length,
                });
                void this.persistenceBridge.submitScore();
              }

              const scoringPayload = this.scoreManager.getPayload();
              // quiz_result/duration_seconds per issue #741's dual-emit
              // table ("+ quiz_result, duration_seconds") — this row is
              // separate from chapter_1_completed below and was missed in
              // the first pass at this fix.
              posthog.capture("quiz_completed", {
                level_id: levelId,
                mission_id: missionId,
                score,
                correct_answers: scoringPayload.quiz.correctAnswers,
                total_questions: shuffledQuestions.length,
                accuracy_percent: scoringPayload.quiz.accuracyPercent,
                passed: isSuccess,
                quiz_result: isSuccess ? "passed" : "failed",
                duration_seconds:
                  this.quizStartedAt !== null
                    ? Math.round((Date.now() - this.quizStartedAt) / 1000)
                    : null,
              });

              // Canonical funnel step — only chapter 1 has one; see the
              // 7-step funnel in docs/specs/edital-onepager.md. Emitted
              // after quiz_completed above, never before: the issue's own
              // acceptance criterion orders the funnel
              // "...quiz_completed → chapter_1_completed", and this used
              // to fire earlier (inside the isSuccess branch, before
              // quiz_completed was even captured), silently breaking that
              // order.
              if (isSuccess && levelDef.levelNumber === 1) {
                const chapter1Payload = this.scoreManager.getPayload();
                posthog.capture("chapter_1_completed", {
                  level_id: levelId,
                  score: chapter1Payload.totalQuarters,
                  stars: chapter1Payload.totalStars,
                  duration_seconds: Math.round(
                    (Date.now() -
                      new Date(chapter1Payload.startedAt).getTime()) /
                      1000,
                  ),
                });
              }

              void this.persistenceBridge.sendQuizOutcome({
                type: isSuccess ? "quiz.completed" : "quiz.failed",
                metadata: {
                  missionId,
                  score,
                  totalQuestions: shuffledQuestions.length,
                  accuracyPercent: scoringPayload.quiz.accuracyPercent,
                  quartersEarned: scoringPayload.quiz.quartersEarned,
                  passed: isSuccess,
                  payload: scoringPayload as unknown as Record<string, unknown>,
                },
                timestamp: new Date().toISOString(),
              });

              const quizResultRecord: QuizResultRecord = {
                completedAt: new Date().toISOString(),
                passed: isSuccess,
                score,
                totalQuestions: shuffledQuestions.length,
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
                total_questions: shuffledQuestions.length,
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

              this.context.getEvents().emit(GameEvents.MISSION_STATUS_CHANGED);
              this.questManager.setPendingResult(missionId, lines);

              if (isSuccess) {
                this.levelManager.updateProgress();
              }

              this.quizMode = "none";
              this.isQuizActive = false;
            },
            { quizNumber: null, attemptNumber: this.quizAttemptsForMission },
          );
        },
        () => {
          this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
          this.context.getEvents().emit(GameEvents.MISSION_STATUS_CHANGED);
        },
        undefined,
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

      const shuffledQuestions = prepareQuizQuestions(questions);

      posthog.capture("intermediate_quiz_started", {
        quiz_number: INTERMEDIATE_QUIZ_NUMBERS[infoKey] ?? null,
        level_id: this.context.getLevelId(),
        info_key: infoKey,
      });

      this.quizMode = "intermediate";

      // Resolve the active mission for this level so callbacks are not
      // hardcoded to level-1's mission id.
      const activeMissionId =
        this.context.getLevelDef().activeMissions[0] ?? MissionIds.CURATOR;

      const spawnPos = npc.getSpawnPosition();
      const playerX = this.context.getPlayer().x;
      const npcX = playerX + 150;
      const npcY = this.context.getPlayer().y;

      npc.showForQuiz(npcX, npcY);

      const onComplete = this.createIntermediateQuizCallback(
        infoKey,
        shuffledQuestions,
        npc,
        spawnPos,
        activeMissionId,
      );

      const explanationLines = npc.getIntermediateQuizDialogues();
      if (explanationLines.length > 0) {
        this.pendingIntermediateQuizQuestions = shuffledQuestions;
        this.pendingIntermediateQuizOnComplete = onComplete;
        this.context.getEvents().emit(
          GameEvents.SHOW_DIALOGUE_REQUEST,
          npc.prependName(explanationLines),
          () => {
            this.pendingIntermediateQuizQuestions = null;
            this.pendingIntermediateQuizOnComplete = null;
            this.context
              .getEvents()
              .emit(
                GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
                shuffledQuestions,
                onComplete,
                {
                  quizNumber: INTERMEDIATE_QUIZ_NUMBERS[infoKey] ?? null,
                  attemptNumber: 1,
                },
              );
          },
          { x: npcX, y: npcY },
        );
      } else {
        this.context
          .getEvents()
          .emit(
            GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
            shuffledQuestions,
            onComplete,
            {
              quizNumber: INTERMEDIATE_QUIZ_NUMBERS[infoKey] ?? null,
              attemptNumber: 1,
            },
          );
      }
    } catch (error) {
      console.error(`[QuizManager] Error starting intermediate quiz: ${error}`);
    }
  }

  public triggerPendingIntermediateQuiz(): boolean {
    if (
      this.quizMode === "intermediate" &&
      this.pendingIntermediateQuizQuestions
    ) {
      const questions = this.pendingIntermediateQuizQuestions;
      const onComplete = this.pendingIntermediateQuizOnComplete!;
      this.pendingIntermediateQuizQuestions = null;
      this.pendingIntermediateQuizOnComplete = null;
      this.context
        .getEvents()
        .emit(GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST, questions, onComplete);
      return true;
    }
    return false;
  }

  private createIntermediateQuizCallback(
    infoKey: string,
    questions: QuizQuestion[],
    npc: NpcLike,
    spawnPos: { x: number; y: number } | null,
    missionId: string,
  ) {
    return (score: number) => {
      const passed = score > 0;
      // New scoring: pass correct answers and total questions
      this.scoreManager.recordIntermediateQuizResult(
        infoKey,
        score,
        questions.length,
      );
      this.questManager.markIntermediateQuizDone(infoKey);

      this.progressionManager.recordIntermediateQuizResult(infoKey, {
        completedAt: new Date().toISOString(),
        passed,
        score,
        totalQuestions: questions.length,
        missionId,
      });

      void this.persistenceBridge.saveProgress();

      const floorCompleted = FLOOR_COMPLETE_KEYS.has(infoKey);

      if (floorCompleted) {
        const finalPos = npc.getFinalPosition() ?? NPC_FLOOR_3_POSITION;
        npc.teleportTo(finalPos.x, finalPos.y);
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
        quiz_number: INTERMEDIATE_QUIZ_NUMBERS[infoKey] ?? null,
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
          missionId,
        },
        timestamp: new Date().toISOString(),
      });

      if (
        this.questManager.hasCollectedAll(missionId) &&
        this.questManager.getStatus(missionId) !== QuestStatus.READY_FOR_QUIZ &&
        this.questManager.getStatus(missionId) !== QuestStatus.QUIZ_ACTIVE &&
        this.questManager.getStatus(missionId) !== QuestStatus.COMPLETED
      ) {
        this.questManager.setStatus(missionId, QuestStatus.READY_FOR_QUIZ);
      }
    };
  }

  private findCuratorNpc(): NpcLike | undefined {
    const activeMissions = this.context.getLevelDef().activeMissions ?? [];
    return this.context
      .getNpcs()
      .find(
        (n) =>
          typeof (n as unknown as NpcLike).getMissionId === "function" &&
          activeMissions.includes((n as unknown as NpcLike).getMissionId()),
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
