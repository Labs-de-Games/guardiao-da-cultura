import { Scene } from "phaser";
import posthog from "posthog-js";
import { submitScore } from "../../lib/scoresApi";
import { GameEvents } from "../constants/GameEvents";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";
import type { QuestManager } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { BadgeGalleryPanel } from "../objects/ui/BadgeGalleryPanel";
import { ChunkSelector } from "../objects/ui/ChunkSelector";
import { ControlsOverlay } from "../objects/ui/ControlsOverlay";
import { DialoguePanel } from "../objects/ui/DialoguePanel";
import { LabelPanel } from "../objects/ui/LabelPanel";
import { QuizPanel } from "../objects/ui/QuizPanel";
import { ToastNotification } from "../objects/ui/ToastNotification";
import { onKeyDown, registerScene } from "../systems/InputManager";
import type { PlaceholderSystem } from "../systems/PlaceholderSystem";
import type {
  InteractionUIData,
  LabelInfoData,
  QuizQuestion,
  UIInitData,
} from "../types/GameDataTypes";

export class UIScene extends Scene {
  private questManager!: QuestManager;
  private placeholderSystem!: PlaceholderSystem;

  private root!: Phaser.GameObjects.Container;
  private controlsOverlay!: ControlsOverlay;
  private dialoguePanel!: DialoguePanel;
  private labelPanel!: LabelPanel;
  private quizPanel!: QuizPanel;
  private chunkSelector!: ChunkSelector;
  private toast!: ToastNotification;
  private badgeGalleryPanel!: BadgeGalleryPanel;

  private pendingMissionCompleteToastCount: number = 0;

  private activeInteractionPrompts: Set<Phaser.GameObjects.GameObject> =
    new Set();

  constructor() {
    super(SceneNames.UI);
  }

  init(data: UIInitData) {
    this.questManager = data.questManager;
    this.placeholderSystem = data.placeholderSystem;

    this.pendingMissionCompleteToastCount = 0;
    this.activeInteractionPrompts.clear();
    this.phaseCompletePanel = null;
  }

  create() {
    this.root = this.add.container(-20, 0);
    this.root.setDepth(LayoutConfig.UI.DEPTHS.ROOT);

    this.controlsOverlay = new ControlsOverlay(this);
    this.dialoguePanel = new DialoguePanel(this);
    this.labelPanel = new LabelPanel(this);
    this.quizPanel = new QuizPanel(this);
    this.chunkSelector = new ChunkSelector(this);
    this.toast = new ToastNotification(this);
    this.badgeGalleryPanel = new BadgeGalleryPanel(this);

    this.setupEventListeners();
    this.setupKeyboardListeners();
    registerScene(this);

    this.layout();

    this.controlsOverlay.show();
  }

  private setupEventListeners() {
    const gameScene = this.scene.get(SceneNames.GAME);

    gameScene.events.on(GameEvents.DIALOGUE_ENDED, () =>
      this.onDialogueEnded(),
    );

    gameScene.events.on(
      GameEvents.SHOW_DIALOGUE_REQUEST,
      (lines: string[], onComplete?: () => void) => {
        if (this.dialoguePanel) {
          this.dialoguePanel.showDialogue(lines, onComplete);
        }
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
        if (this.dialoguePanel) {
          this.dialoguePanel.showConfirmation(message, onYes, onNo);
        }
      },
    );

    gameScene.events.on(
      GameEvents.SHOW_LABEL_REQUEST,
      (data: LabelInfoData) => {
        if (this.labelPanel) {
          this.labelPanel.showLabel(data);
        }
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
        if (this.toast) {
          this.toast.showToast(
            `Conquista Desbloqueada:\n${badge.name}`,
            4000,
            badge.icon_key,
          );
        }
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

    this.scale.on("resize", () => this.layout());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize");

      if (gameScene?.events) {
        gameScene.events.off(GameEvents.DIALOGUE_ENDED);
        gameScene.events.off(GameEvents.SHOW_DIALOGUE_REQUEST);
        gameScene.events.off(GameEvents.SHOW_QUIZ_REQUEST);
        gameScene.events.off(GameEvents.SHOW_CONFIRMATION_REQUEST);
        gameScene.events.off(GameEvents.SHOW_LABEL_REQUEST);
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

    this.controlsOverlay.layout(w, h);
    this.dialoguePanel.layout(w, h);
    this.labelPanel.layout(w, h);
    this.quizPanel.layout(w, h);
    this.chunkSelector.layout(w, h);
    this.toast.layout(w, h);
    this.badgeGalleryPanel.layout(w, h);
  }

  private toggleControls() {
    if (this.controlsOverlay.isVisible) {
      this.controlsOverlay.hide();
      return;
    }

    if (this.canShowOverlay()) {
      this.controlsOverlay.show();
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

    if (
      this.dialoguePanel?.isVisible ||
      this.labelPanel?.isVisible ||
      this.quizPanel?.isVisible
    )
      return false;

    return true;
  }

  private onDialogueEnded() {
    if (this.pendingMissionCompleteToastCount > 0) {
      this.pendingMissionCompleteToastCount = 0;
      this.time.delayedCall(120, () => {
        this.toast.showToast(
          "Missão concluída!\nAperte TAB para ver as relíquias",
        );
      });
    }
  }


  private phaseCompletePanel: Phaser.GameObjects.Container | null = null;

  public async showPhaseCompleteUI(collectedStars: number, maxStars: number) {
    if (this.phaseCompletePanel) this.phaseCompletePanel.destroy();

    const { width: cx, height: cy } = this.scale;
    this.phaseCompletePanel = this.add
      .container(cx / 2, cy / 2)
      .setDepth(10000);

    const bg = this.add
      .rectangle(0, 0, 800, 500, LayoutConfig.COLORS.BLACK_HEX, 0.95)
      .setStrokeStyle(4, LayoutConfig.COLORS.GOLD_HEX);
    const title = this.add
      .text(0, -210, "Fase concluída!", {
        fontSize: LayoutConfig.FONTS.SIZES.TITLE_LARGE,
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);
    const message = this.add
      .text(0, 150, "Parabéns, você completou sua exploração no museu!", {
        fontSize: LayoutConfig.FONTS.SIZES.BODY,
        color: LayoutConfig.COLORS.WHITE,
        wordWrap: { width: 700 },
        align: LayoutConfig.ALIGN.TEXT_CENTER,
      })
      .setOrigin(...LayoutConfig.ALIGN.CENTER);

    const stars = this.add.container(0, -30);
    const starSpacing = 140;
    const startX = -((maxStars - 1) * starSpacing) / 2;

    for (let i = 0; i < maxStars; i++) {
      const star = this.add
        .image(startX + i * starSpacing, 0, "star")
        .setScale(8);
      if (i >= collectedStars)
        star.setTint(LayoutConfig.COLORS.DARK_STAR_TINT).setAlpha(0.5);
      stars.add(star);
    }

    this.phaseCompletePanel.add([bg, title, stars, message]);

    this.input.keyboard?.once("keydown-ESC", () => this.hidePhaseCompleteUI());

    await this.submitScoreToBackend();
  }

  private async submitScoreToBackend() {
    try {
      const scoreManager = this.registry.get("scoreManager") as {
        getPayload: () => unknown;
      };
      const userId = this.registry.get("userId");
      const levelId = this.registry.get("currentLevelId");

      if (!scoreManager || !userId || !levelId) {
        console.warn("[UIScene] Missing data for score submission:", {
          hasScoreManager: !!scoreManager,
          hasUserId: !!userId,
          hasLevelId: !!levelId,
        });
        return;
      }

      const payload = scoreManager.getPayload() as {
        levelId: string;
        totalQuarters: number;
        totalStars: number;
        rating: string;
        floors: Array<{
          floorIndex: number;
          errors: number;
          quartersEarned: number;
        }>;
        quiz: {
          totalQuestions: number;
          correctAnswers: number;
          accuracyPercent: number;
          quartersEarned: number;
        };
        collectibles: {
          total: number;
          interactionsCount: number;
          quartersEarned: number;
          interactions: Array<{
            collectible_id: string;
            collectible_type: string;
          }>;
        };
      };

      await submitScore({
        userId,
        levelId: payload.levelId,
        totalQuarters: payload.totalQuarters,
        totalStars: payload.totalStars,
        rating: payload.rating,
        floors: payload.floors.map((f) => ({
          floorIndex: f.floorIndex,
          errors: f.errors,
          quartersEarned: f.quartersEarned,
        })),
        quiz: {
          totalQuestions: payload.quiz.totalQuestions,
          correctAnswers: payload.quiz.correctAnswers,
          accuracyPercent: payload.quiz.accuracyPercent,
          quartersEarned: payload.quiz.quartersEarned,
        },
        collectibles: {
          total: payload.collectibles.total,
          interactionsCount: payload.collectibles.interactionsCount,
          quartersEarned: payload.collectibles.quartersEarned,
        },
        collectedCollectibles: payload.collectibles.interactions.map(
          (interaction) => ({
            collectibleId: interaction.collectible_id,
            collectibleType: interaction.collectible_type as
              | "COLLECT"
              | "CLUE_VILLAIN"
              | "CLUE_NEXT",
            levelId: payload.levelId,
          }),
        ),
      });
    } catch (err) {
      console.error("[UIScene] Failed to submit score:", err);
    }
  }

  public hidePhaseCompleteUI() {
    if (this.phaseCompletePanel) {
      this.phaseCompletePanel.destroy();
      this.phaseCompletePanel = null;
    }
  }
}
