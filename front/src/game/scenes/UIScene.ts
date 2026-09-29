import * as Phaser from "phaser";
import { Scene } from "phaser";
import posthog from "posthog-js";
import { EventBus } from "../../shared/events/event-bus";
import { useDialogueStore } from "../../ui/state/dialogue-store";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import { AudioManager } from "../audio";
import { isLevelEnabled } from "../constants/FeatureFlags";
import { GameEvents } from "../constants/GameEvents";
import {
  INVESTIGATION_LEVEL_ID,
  INVESTIGATION_PREREQUISITE_LEVEL_ID,
} from "../constants/Investigation";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { MAP_MARKERS } from "../constants/MapMarkers";
import { SceneNames } from "../constants/SceneNames";
import { getNextLevelId } from "../data/LevelConfig";
import type { QuestManager } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { CallbackRegistry } from "../systems/CallbackRegistry";
import { onKeyDown, registerScene } from "../systems/InputManager";
import type { PlaceholderSystem } from "../systems/PlaceholderSystem";
import type { QuizQuestion, UIInitData } from "../types/GameDataTypes";
import type { Game } from "./Game";

export class UIScene extends Scene {
  private questManager!: QuestManager;
  private placeholderSystem!: PlaceholderSystem;

  private root!: Phaser.GameObjects.Container;
  private callbackRegistry!: CallbackRegistry;
  private dialogueEndHandled: boolean = false;
  private dialogueActive: boolean = false;
  private isConfirmationPending: boolean = false;
  private unsubQuizClose: (() => void) | null = null;
  private unsubQuizRetry: (() => void) | null = null;
  private unsubQuizNextLevel: (() => void) | null = null;
  private unsubQuizVisibilityWatcher: (() => void) | null = null;
  private unsubStageExit: (() => void) | null = null;

  private activeInteractionPrompts: Set<Phaser.GameObjects.GameObject> =
    new Set();

  constructor() {
    super(SceneNames.UI);
  }

  init(data: UIInitData) {
    this.questManager = data.questManager;
    this.placeholderSystem = data.placeholderSystem;

    this.activeInteractionPrompts.clear();
  }

  create() {
    this.root = this.add.container(-20, 0);
    this.root.setDepth(LayoutConfig.UI.DEPTHS.ROOT);

    this.callbackRegistry = new CallbackRegistry();
    this.callbackRegistry.setupListeners();

    this.setupEventListeners();
    this.setupKeyboardListeners();
    this.setupQuizCloseListener();
    this.setupQuizVisibilityWatcher();
    this.setupStageExitListener();
    registerScene(this);

    this.layout();
  }

  private setupEventListeners() {
    const gameScene = this.scene.get(SceneNames.GAME) as unknown as Game;

    gameScene.events.on(
      GameEvents.SHOW_DIALOGUE_REQUEST,
      (
        lines: string[],
        onComplete?: () => void,
        worldPosition?: { x: number; y: number },
      ) => {
        const callbackId = crypto.randomUUID();
        if (onComplete) {
          this.callbackRegistry.registerDialogue(callbackId, onComplete);
        }

        const pos = worldPosition ?? {
          x: gameScene.player.x,
          y: gameScene.player.y,
        };

        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
        this.time.delayedCall(
          LayoutConfig.GAME.CAMERA.DIALOGUE_ZOOM_DURATION,
          () => {
            EventBus.emit("dialogue:show", {
              lines,
              callbackId,
              worldPosition: pos,
            });
          },
        );
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_QUIZ_REQUEST,
      (
        questions: QuizQuestion[],
        _scoreManager: ScoreManager,
        onComplete: (score: number) => void,
        quizMeta?: { quizNumber: number | null; attemptNumber: number },
      ) => {
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED, "quiz");
        const quizState = useGameUIStore.getState().quiz;
        if (quizState.isVisible) return;
        useGameUIStore
          .getState()
          .startQuiz(
            questions,
            onComplete,
            false,
            quizMeta?.quizNumber ?? null,
            quizMeta?.attemptNumber ?? 1,
          );
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST,
      (
        questions: QuizQuestion[],
        onComplete: (score: number) => void,
        quizMeta?: { quizNumber: number | null; attemptNumber: number },
      ) => {
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED, "quiz");
        const quizState = useGameUIStore.getState().quiz;
        if (quizState.isVisible) return;
        useGameUIStore
          .getState()
          .startQuiz(
            questions,
            onComplete,
            true,
            quizMeta?.quizNumber ?? null,
            quizMeta?.attemptNumber ?? 1,
          );
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_CONFIRMATION_REQUEST,
      (
        message: string,
        speakerName: string,
        onYes: () => void,
        onNo: () => void,
        worldPosition?: { x: number; y: number },
        onDismiss?: () => void,
      ) => {
        const callbackId = crypto.randomUUID();
        this.callbackRegistry.registerConfirm(
          callbackId,
          onYes,
          onNo,
          onDismiss,
        );

        const pos = worldPosition ?? {
          x: gameScene.player.x,
          y: gameScene.player.y,
        };

        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        this.isConfirmationPending = true;
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
        this.time.delayedCall(
          LayoutConfig.GAME.CAMERA.DIALOGUE_ZOOM_DURATION,
          () => {
            EventBus.emit("dialogue:confirm", {
              message,
              speakerName,
              callbackId,
              worldPosition: pos,
            });
          },
        );
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_BADGE_TOAST,
      (badge: { name: string; icon_key: string }) => {
        EventBus.emit("ui:toast-show", {
          message: `Conquista Desbloqueada:\n${badge.name}`,
          duration: 4000,
          iconSrc: `data/badges/${badge.icon_key}.png`,
        });
      },
    );

    gameScene.events.on(
      GameEvents.INTERACTION_PROMPT_SHOWN,
      (obj: Phaser.GameObjects.GameObject) => {
        this.activeInteractionPrompts.add(obj);
      },
    );
    gameScene.events.on(
      GameEvents.INTERACTION_PROMPT_HIDDEN,
      (obj: Phaser.GameObjects.GameObject) => {
        this.activeInteractionPrompts.delete(obj);
      },
    );

    const unsubDialogueCompleted = EventBus.on("dialogue:completed", () => {
      if (this.dialogueEndHandled) return;
      if (this.isConfirmationPending) {
        this.isConfirmationPending = false;
        return;
      }
      this.dialogueEndHandled = true;
      this.dialogueActive = false;
      gameScene.events.emit(GameEvents.DIALOGUE_ENDED, { dismissed: false });
    });

    const unsubDialogueDismissed = EventBus.on("dialogue:dismissed", () => {
      if (this.dialogueEndHandled) return;
      this.dialogueEndHandled = true;
      this.dialogueActive = false;
      gameScene.events.emit(GameEvents.DIALOGUE_ENDED, { dismissed: true });
    });

    const unsubDialogueDequeueStarted = EventBus.on(
      "dialogue:dequeue-started",
      () => {
        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
      },
    );

    // UI Sound Effects
    const unsubSoundClick = EventBus.on("ui:sound-click", () => {
      AudioManager.playSfx("sfx.ui.click");
    });

    const unsubSoundHover = EventBus.on("ui:sound-hover", () => {
      AudioManager.playSfx("sfx.ui.click");
    });

    const unsubSoundBadgeUnlock = EventBus.on("ui:sound-badge-unlock", () => {
      AudioManager.playSfx("sfx.badge.unlock");
    });

    const unsubSoundLevelComplete = EventBus.on(
      "ui:sound-level-complete",
      () => {
        AudioManager.playSfx("sfx.level.complete");
      },
    );

    const unsubSoundGeniusNote = EventBus.on(
      "ui:sound-genius-note",
      ({ color }) => {
        AudioManager.playSfx(`sfx.genius.${color}`);
      },
    );

    // Badge unlock sound (triggered by BadgeSystem)
    const unsubBadgeUnlocked = EventBus.on("badge:unlocked", () => {
      AudioManager.playSfx("sfx.badge.unlock");
    });

    // Under Scale.FIT, this.scale.width/height stay fixed at the base game
    // resolution, so this recomputes the same layout on every resize.
    this.scale.on("resize", () => this.layout());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize");
      unsubDialogueCompleted();
      unsubDialogueDismissed();
      unsubDialogueDequeueStarted();
      unsubSoundClick();
      unsubSoundHover();
      unsubSoundBadgeUnlock();
      unsubSoundLevelComplete();
      unsubSoundGeniusNote();
      unsubBadgeUnlocked();
      this.unsubQuizClose?.();
      this.unsubQuizRetry?.();
      this.unsubQuizNextLevel?.();
      this.unsubQuizVisibilityWatcher?.();
      this.unsubStageExit?.();
      this.callbackRegistry.cleanup();

      if (gameScene?.events) {
        gameScene.events.off(GameEvents.SHOW_DIALOGUE_REQUEST);
        gameScene.events.off(GameEvents.SHOW_QUIZ_REQUEST);
        gameScene.events.off(GameEvents.SHOW_INTERMEDIATE_QUIZ_REQUEST);
        gameScene.events.off(GameEvents.SHOW_CONFIRMATION_REQUEST);
        gameScene.events.off(GameEvents.INTERACTION_PROMPT_SHOWN);
        gameScene.events.off(GameEvents.INTERACTION_PROMPT_HIDDEN);
        gameScene.events.off(GameEvents.SHOW_BADGE_TOAST);
      }
    });
  }

  private setupKeyboardListeners() {
    onKeyDown(this, Actions.TOGGLE_BADGE_GALLERY, () => {
      EventBus.emit("ui:badge-gallery-toggle", { open: true });
    });

    onKeyDown(this, Actions.TOGGLE_CONTROLS, () => {
      this.toggleControls();
    });
  }

  private setupQuizCloseListener() {
    this.unsubQuizClose = EventBus.on("quiz:close", () => {
      useGameUIStore.getState().closeQuiz();

      EventBus.emit("game:ended", undefined);
      this.scene.stop(SceneNames.GAME);
      this.scene.start(SceneNames.INTRO);
    });

    this.unsubQuizNextLevel = EventBus.on("quiz:next-level", () => {
      const currentLevelId = this.registry.get("currentLevelId") as
        | string
        | undefined;
      const nextLevelId = currentLevelId
        ? getNextLevelId(currentLevelId)
        : undefined;

      // Out of playable levels, but the investigation is the real ending:
      // finishing the last phase hands straight off to the identification
      // screen (through the cinematic, like any other phase).
      if (
        !nextLevelId &&
        currentLevelId === INVESTIGATION_PREREQUISITE_LEVEL_ID &&
        isLevelEnabled(INVESTIGATION_LEVEL_ID)
      ) {
        posthog.capture("level_next_started", {
          from_level_id: currentLevelId,
          to_level_id: INVESTIGATION_LEVEL_ID,
        });

        useGameUIStore.getState().closeQuiz();
        EventBus.emit("game:ended", undefined);

        const investigationMarker = MAP_MARKERS.find(
          (m) => m.levelId === INVESTIGATION_LEVEL_ID,
        );
        if (investigationMarker) {
          useGameUIStore.getState().setLevelInfo({
            title: investigationMarker.title,
            location: investigationMarker.location,
            shortlocation: investigationMarker.shortlocation,
          });
        }
        useGameUIStore.getState().setActiveMapMarker(null);

        AudioManager.fadeOutMusic(350);
        this.scene.stop(SceneNames.GAME);
        this.scene.start(SceneNames.LEVEL_CINEMATIC, {
          levelId: INVESTIGATION_LEVEL_ID,
        });
        return;
      }

      // No next playable level: the player has reached the end of the content,
      // so close the quiz and hand them back to the world map — the same exit
      // "quiz:close" performs. Previously this invited them to leave an email
      // for new-phase notices; that collection was removed entirely.
      if (!nextLevelId || !isLevelEnabled(nextLevelId)) {
        useGameUIStore.getState().closeQuiz();
        EventBus.emit("game:ended", undefined);
        this.scene.stop(SceneNames.GAME);
        this.scene.start(SceneNames.INTRO);
        return;
      }

      posthog.capture("level_next_started", {
        from_level_id: currentLevelId,
        to_level_id: nextLevelId,
      });

      // Close the quiz while the Game scene is still alive so the visibility
      // watcher can release the dialogue lock on it.
      useGameUIStore.getState().closeQuiz();
      // Clear level-scoped UI (missions, collectibles, score, levelInfo…)
      // before seeding the next level's info — endGame() nulls levelInfo.
      EventBus.emit("game:ended", undefined);

      const nextMarker = MAP_MARKERS.find((m) => m.levelId === nextLevelId);
      if (nextMarker) {
        useGameUIStore.getState().setLevelInfo({
          title: nextMarker.title,
          location: nextMarker.location,
          shortlocation: nextMarker.shortlocation,
        });
      }
      useGameUIStore.getState().setActiveMapMarker(null);

      // Let the next level start its own music (mirrors MapIntroScene).
      this.registry.remove(`music_started:${nextLevelId}`);
      AudioManager.fadeOutMusic(350);

      this.scene.stop(SceneNames.GAME);
      this.scene.start(SceneNames.LEVEL_CINEMATIC, { levelId: nextLevelId });
    });

    this.unsubQuizRetry = EventBus.on("quiz:retry", () => {
      const gameScene = this.scene.get(SceneNames.GAME);
      useGameUIStore.getState().closeQuiz();
      gameScene.events.emit(GameEvents.DIALOGUE_ENDED, { source: "quiz" });
    });
  }

  private setupStageExitListener() {
    this.unsubStageExit = EventBus.on("stage:exit-confirmed", () => {
      // The confirmation prompt paused GAME+UI while it was open. GAME is
      // stopped below, so resuming it first is unnecessary — worse, doing so
      // re-arms its update() loop for a tick while the scene is mid-teardown,
      // which throws (this.cameras.main is transiently unset). UI is never
      // stopped here, so it alone needs resuming — explicitly, rather than
      // relying on the "game:resume-requested" React cleanup, which fires
      // after this stop and would be dropped (Game.ts unsubscribes its own
      // EventBus listeners on shutdown).
      this.scene.resume(SceneNames.UI);

      EventBus.emit("game:ended", undefined);
      this.scene.stop(SceneNames.GAME);
      this.scene.start(SceneNames.INTRO);
    });
  }

  private setupQuizVisibilityWatcher() {
    let wasVisible = useGameUIStore.getState().quiz.isVisible;
    this.unsubQuizVisibilityWatcher = useGameUIStore.subscribe((state) => {
      const isVisible = state.quiz.isVisible;
      if (wasVisible && !isVisible) {
        this.dialogueActive = false;
        this.dialogueEndHandled = false;
        useDialogueStore.getState().closeDialogue();
        const gameScene = this.scene.get(SceneNames.GAME);
        gameScene.events.emit(GameEvents.DIALOGUE_ENDED, { source: "quiz" });
      }
      wasVisible = isVisible;
    });
  }

  private layout() {
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);
  }

  private toggleControls() {
    const currentOpen = useGameUIStore.getState().controlsOpen;
    const newOpen = !currentOpen;

    if (newOpen && !this.canShowOverlay()) return;

    EventBus.emit("ui:controls-overlay", { open: newOpen });

    if (newOpen) {
      posthog.capture("settings_opened", {
        from_screen: "game",
      });
    }
  }

  private canShowOverlay(): boolean {
    if (this.activeInteractionPrompts.size > 0) return false;
    if (this.dialogueActive) return false;

    return true;
  }
}
