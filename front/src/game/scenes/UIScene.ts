import { Scene } from "phaser";
import posthog from "posthog-js";
import { EventBus } from "../../shared/events/event-bus";
import { useDialogueStore } from "../../ui/state/dialogue-store";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import { GameEvents } from "../constants/GameEvents";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";
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
  private unsubQuizClose: (() => void) | null = null;
  private unsubQuizRetry: (() => void) | null = null;
  private unsubQuizVisibilityWatcher: (() => void) | null = null;

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
        const camera = gameScene.cameras.main;
        const screenPosition = {
          x: pos.x - camera.worldView.x,
          y: pos.y - camera.worldView.y,
        };

        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        EventBus.emit("dialogue:show", { lines, callbackId, screenPosition });
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
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
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
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
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
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
      ) => {
        const callbackId = crypto.randomUUID();
        this.callbackRegistry.registerConfirm(callbackId, onYes, onNo);

        const pos = worldPosition ?? {
          x: gameScene.player.x,
          y: gameScene.player.y,
        };
        const camera = gameScene.cameras.main;
        const screenPosition = {
          x: pos.x - camera.worldView.x,
          y: pos.y - camera.worldView.y,
        };

        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        EventBus.emit("dialogue:confirm", {
          message,
          speakerName,
          callbackId,
          screenPosition,
        });
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
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

    this.scale.on("resize", () => this.layout());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize");
      unsubDialogueCompleted();
      unsubDialogueDismissed();
      unsubDialogueDequeueStarted();
      this.unsubQuizClose?.();
      this.unsubQuizRetry?.();
      this.unsubQuizVisibilityWatcher?.();
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

      const entryFlow =
        (this.registry.get("entryFlow") as string | undefined) ?? "map";

      if (entryFlow === "direct") {
        this.scene.stop(SceneNames.GAME);
        this.scene.start(SceneNames.GAME, { levelId: "level_01" });
        return;
      }

      EventBus.emit("game:ended", undefined);
      this.scene.stop(SceneNames.GAME);
      this.scene.start(SceneNames.INTRO);
    });

    this.unsubQuizRetry = EventBus.on("quiz:retry", () => {
      const gameScene = this.scene.get(SceneNames.GAME);
      useGameUIStore.getState().closeQuiz();
      gameScene.events.emit(GameEvents.DIALOGUE_ENDED);
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
        gameScene.events.emit(GameEvents.DIALOGUE_ENDED);
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
