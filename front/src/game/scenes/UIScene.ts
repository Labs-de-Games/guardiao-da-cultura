import { Scene } from "phaser";
import posthog from "posthog-js";
import { EventBus } from "../../shared/events/event-bus";
import { useGameUIStore } from "../../ui/state/game-ui-store";
import { GameEvents } from "../constants/GameEvents";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";
import type { QuestManager } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { BadgeGalleryPanel } from "../objects/ui/BadgeGalleryPanel";
import { ChunkSelector } from "../objects/ui/ChunkSelector";
import { LabelPanel } from "../objects/ui/LabelPanel";
import { ControlsOverlay } from "../objects/ui/ControlsOverlay";
import { DialoguePanel } from "../objects/ui/DialoguePanel";
import { QuizPanel } from "../objects/ui/QuizPanel";
import { CallbackRegistry } from "../systems/CallbackRegistry";
import { onKeyDown, registerScene } from "../systems/InputManager";
import type { PlaceholderSystem } from "../systems/PlaceholderSystem";
import type {
  InteractionUIData,
  QuizQuestion,
  UIInitData,
} from "../types/GameDataTypes";

export class UIScene extends Scene {
  private questManager!: QuestManager;
  private placeholderSystem!: PlaceholderSystem;

  private root!: Phaser.GameObjects.Container;
  private labelPanel!: LabelPanel;
  private controlsOverlay!: ControlsOverlay;
  private dialoguePanel!: DialoguePanel;
  private quizPanel!: QuizPanel;
  private chunkSelector!: ChunkSelector;
  private badgeGalleryPanel!: BadgeGalleryPanel;
  private callbackRegistry!: CallbackRegistry;
  private dialogueEndHandled: boolean = false;
  private dialogueActive: boolean = false;

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

    this.labelPanel = new LabelPanel(this);
    this.controlsOverlay = new ControlsOverlay(this);
    this.dialoguePanel = new DialoguePanel(this);
    this.quizPanel = new QuizPanel(this);
    this.chunkSelector = new ChunkSelector(this);
    this.badgeGalleryPanel = new BadgeGalleryPanel(this);
    this.callbackRegistry = new CallbackRegistry();
    this.callbackRegistry.setupListeners();

    this.setupEventListeners();
    this.setupKeyboardListeners();
    registerScene(this);

    this.layout();
  }

  private setupEventListeners() {
    const gameScene = this.scene.get(SceneNames.GAME);

    gameScene.events.on(
      GameEvents.SHOW_DIALOGUE_REQUEST,
      (lines: string[], onComplete?: () => void) => {
        const callbackId = crypto.randomUUID();
        if (onComplete) {
          this.callbackRegistry.registerDialogue(callbackId, onComplete);
        }
        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        EventBus.emit("dialogue:show", { lines, callbackId });
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_QUIZ_REQUEST,
      (
        questions: QuizQuestion[],
        scoreManager: ScoreManager,
        onComplete: (score: number) => void,
      ) => {
        if (this.quizPanel) {
          this.quizPanel.startQuiz(questions, scoreManager, onComplete);
        }
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_CONFIRMATION_REQUEST,
      (message: string, onYes: () => void, onNo: () => void) => {
        const callbackId = crypto.randomUUID();
        this.callbackRegistry.registerConfirm(callbackId, onYes, onNo);
        this.dialogueEndHandled = false;
        this.dialogueActive = true;
        EventBus.emit("dialogue:confirm", { message, callbackId });
        gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
      },
    );

    gameScene.events.on(
      GameEvents.OPEN_INTERACTION_UI_REQUEST,
      (data: InteractionUIData) => {
        if (this.chunkSelector) {
          this.chunkSelector.show(
            data.instanceId,
            data.availableItems,
            data.state?.filledSlots || [],
          );
        }
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
      gameScene.events.emit(GameEvents.DIALOGUE_ENDED);
    });

    const unsubDialogueDismissed = EventBus.on("dialogue:dismissed", () => {
      if (this.dialogueEndHandled) return;
      this.dialogueEndHandled = true;
      this.dialogueActive = false;
      gameScene.events.emit(GameEvents.DIALOGUE_ENDED);
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
      this.callbackRegistry.cleanup();

      if (gameScene?.events) {
        gameScene.events.off(GameEvents.SHOW_DIALOGUE_REQUEST);
        gameScene.events.off(GameEvents.SHOW_QUIZ_REQUEST);
        gameScene.events.off(GameEvents.SHOW_CONFIRMATION_REQUEST);
        gameScene.events.off(GameEvents.INTERACTION_PROMPT_SHOWN);
        gameScene.events.off(GameEvents.INTERACTION_PROMPT_HIDDEN);
        gameScene.events.off(GameEvents.SHOW_BADGE_TOAST);
      }
    });
  }

  private setupKeyboardListeners() {
    onKeyDown(this, Actions.TOGGLE_BADGE_GALLERY, () => {
      this.toggleBadgeGallery();
    });

    onKeyDown(this, Actions.TOGGLE_CONTROLS, () => {
      this.toggleControls();
    });
  }

  private layout() {
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);

    this.labelPanel.layout(w, h);
    this.controlsOverlay.layout(w, h);
    this.dialoguePanel.layout(w, h);
    this.quizPanel.layout(w, h);
    this.chunkSelector.layout(w, h);
    this.badgeGalleryPanel.layout(w, h);
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

  private toggleBadgeGallery() {
    if (this.badgeGalleryPanel.isVisible) {
      this.badgeGalleryPanel.hide();
      return;
    }

    if (this.canShowOverlay()) {
      this.badgeGalleryPanel.show();
    }
  }

  private canShowOverlay(): boolean {
    if (this.activeInteractionPrompts.size > 0) return false;
    if (this.dialogueActive) return false;
    if (this.dialoguePanel?.isVisible || this.labelPanel?.isVisible || this.quizPanel?.isVisible) return false;

    return true;
  }
}
