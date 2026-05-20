import { Scene } from "phaser";
import { submitScore } from "../../lib/scoresApi";
import { GameEvents } from "../constants/GameEvents";
import { Actions } from "../constants/KeyBindings";
import { LayoutConfig } from "../constants/LayoutConfig";
import { SceneNames } from "../constants/SceneNames";
import { type QuestManager, QuestStatus } from "../objects/QuestManager";
import type { ScoreManager } from "../objects/ScoreManager";
import { BadgeGalleryPanel } from "../objects/ui/BadgeGalleryPanel";
import { ChunkSelector } from "../objects/ui/ChunkSelector";
import { ControlsOverlay } from "../objects/ui/ControlsOverlay";
import { DialoguePanel } from "../objects/ui/DialoguePanel";
import { LabelPanel } from "../objects/ui/LabelPanel";
// Novos componentes SRP
import { PhaseStatusPanel } from "../objects/ui/PhaseStatusPanel";
import { QuizPanel } from "../objects/ui/QuizPanel";
import { ToastNotification } from "../objects/ui/ToastNotification";
import { onKeyDown, registerScene } from "../systems/InputManager";
import type {
  InteractionUIData,
  LabelInfoData,
  MissionDef,
  MissionStepDef,
  QuizQuestion,
  UIInitData,
} from "../types/GameDataTypes";

/**
 * UIScene.ts - Orquestrador de Interface.
 * Deixou de ser uma God Class (+1000 linhas) para se tornar um orquestrador leve
 * que gerencia a comunicação entre sistemas de jogo e componentes de UI.
 */
export class UIScene extends Scene {
  // Estado e Dados
  private questManager!: QuestManager;
  private missionDefs: Record<string, MissionDef> = {};
  private missionsTotal: number = 0;

  // Componentes Especialistas
  private root!: Phaser.GameObjects.Container;
  private statusPanel!: PhaseStatusPanel;
  private controlsOverlay!: ControlsOverlay;
  private dialoguePanel!: DialoguePanel;
  private labelPanel!: LabelPanel;
  private quizPanel!: QuizPanel;
  private chunkSelector!: ChunkSelector;
  private toast!: ToastNotification;
  private badgeGalleryPanel!: BadgeGalleryPanel;

  // Gestão de Missões (Individual Cards - candidate for further extraction)
  private activeMissionIds: string[] = [];
  private missionPanels: Phaser.GameObjects.Container[] = [];
  private missionStepTexts: Map<string, Phaser.GameObjects.Text[]> = new Map();
  private lastMissionStatuses: Map<string, QuestStatus> = new Map();
  private pendingMissionCompleteToastCount: number = 0;

  // Prompt de Interação (tracking para bloquear overlays)
  private activeInteractionPrompts: Set<Phaser.GameObjects.GameObject> =
    new Set();

  constructor() {
    super(SceneNames.UI);
  }

  init(data: UIInitData) {
    this.questManager = data.questManager;
    this.missionDefs = data.missionDefs || {};
    this.missionsTotal = data.missionsTotal || 0;

    // Reset state for scene restarts
    this.activeMissionIds = [];
    this.missionPanels = [];
    this.missionStepTexts.clear();
    this.lastMissionStatuses.clear();
    this.pendingMissionCompleteToastCount = 0;
    this.activeInteractionPrompts.clear();
    this.phaseCompletePanel = null;
  }

  create() {
    // 1. Inicialização do Root (Offset padrão do protótipo)
    this.root = this.add.container(-20, 0);
    this.root.setDepth(LayoutConfig.UI.DEPTHS.ROOT);

    // 2. Instanciação de Componentes
    this.statusPanel = new PhaseStatusPanel(
      this,
      "Inhotim",
      this.missionsTotal,
      this.questManager,
    );
    this.controlsOverlay = new ControlsOverlay(this);
    this.dialoguePanel = new DialoguePanel(this);
    this.labelPanel = new LabelPanel(this);
    this.quizPanel = new QuizPanel(this);
    this.chunkSelector = new ChunkSelector(this);
    this.toast = new ToastNotification(this);
    this.badgeGalleryPanel = new BadgeGalleryPanel(this);

    this.root.add(this.statusPanel);
    // Overlays e Toasts são adicionados diretamente à cena via add.existing no construtor

    // 3. Configuração de Eventos
    this.setupEventListeners();
    this.setupKeyboardListeners();
    registerScene(this);

    // 4. Estado Inicial
    this.seedInitialState();
    this.layout();
    this.refreshAll();

    // Exibe controles na entrada
    this.controlsOverlay.show();
  }

  // --- ORQUESTRAÇÃO E EVENTOS ---

  private setupEventListeners() {
    const gameScene = this.scene.get(SceneNames.GAME);

    // Mudanças de Missão
    gameScene.events.on(GameEvents.MISSION_ACCEPTED, (id: string) =>
      this.onMissionAccepted(id),
    );
    gameScene.events.on(GameEvents.MISSION_PROGRESS_CHANGED, () =>
      this.refreshAll(),
    );
    gameScene.events.on(GameEvents.MISSION_STATUS_CHANGED, () =>
      this.onMissionStatusChanged(),
    );
    gameScene.events.on(GameEvents.DIALOGUE_ENDED, () =>
      this.onDialogueEnded(),
    );

    // Requisiçōes de UI
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

    // Prompts de Interação (bloqueio de overlays)
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

    // Responsividade
    this.scale.on("resize", () => this.layout());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize");

      // Unregister gameScene events (vazamento de memória evitado)
      if (gameScene?.events) {
        gameScene.events.off(GameEvents.MISSION_ACCEPTED);
        gameScene.events.off(GameEvents.MISSION_PROGRESS_CHANGED);
        gameScene.events.off(GameEvents.MISSION_STATUS_CHANGED);
        gameScene.events.off(GameEvents.DIALOGUE_ENDED);
        gameScene.events.off(GameEvents.CONTROLS_OVERLAY_CLOSED);
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
    onKeyDown(this, Actions.TOGGLE_PANEL, () => {
      this.toggleBadgeGallery();
    });

    onKeyDown(this, Actions.TOGGLE_CONTROLS, () => {
      this.toggleControls();
    });
  }

  private seedInitialState() {
    // Registra status iniciais para detectar transições (Toasts)
    for (const id in this.missionDefs) {
      this.lastMissionStatuses.set(id, this.questManager.getStatus(id));
    }
  }

  // --- LÓGICA DE NEGÓCIO DA UI ---

  private layout() {
    const { width: w, height: h } = this.scale;
    this.cameras.main.setSize(w, h);

    this.statusPanel.layout(w, h);
    this.controlsOverlay.layout(w, h);
    this.dialoguePanel.layout(w, h);
    this.labelPanel.layout(w, h);
    this.quizPanel.layout(w, h);
    this.chunkSelector.layout(w, h);
    this.toast.layout(w, h);
    this.badgeGalleryPanel.layout(w, h);

    this.positionMissionPanels();
  }

  private refreshAll() {
    this.statusPanel.refresh();
    this.activeMissionIds.forEach((id) => {
      this.refreshMissionSteps(id);
    });
  }

  private toggleControls() {
    if (this.controlsOverlay.isVisible) {
      this.controlsOverlay.hide();
      return;
    }

    if (this.canShowOverlay()) {
      this.controlsOverlay.show();
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

    // Regra: não abrir se algum painel crítico (dialog/quiz) estiver visível
    if (
      this.dialoguePanel?.isVisible ||
      this.labelPanel?.isVisible ||
      this.quizPanel?.isVisible
    )
      return false;

    return true;
  }

  private onMissionAccepted(missionId: string) {
    if (this.activeMissionIds.includes(missionId)) return;

    const mission = this.missionDefs[missionId];
    if (!mission) return;

    this.activeMissionIds.push(missionId);
    const panel = this.createMissionPanel(mission);
    this.missionPanels.push(panel);
    this.root.add(panel);

    this.layout();
    this.refreshAll();
  }

  private onMissionStatusChanged() {
    for (const id in this.missionDefs) {
      const prev = this.lastMissionStatuses.get(id);
      const next = this.questManager.getStatus(id);

      if (next === QuestStatus.COMPLETED && prev !== QuestStatus.COMPLETED) {
        this.pendingMissionCompleteToastCount++;
      }
      this.lastMissionStatuses.set(id, next);
    }
    this.refreshAll();
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

  // --- MÉTODOS DE SUPORTE (Simplificados) ---

  private positionMissionPanels() {
    const padding = LayoutConfig.UI.PADDING;
    const x = this.scale.width - padding;
    let y = padding + 110 + 10; // Abaixo do status panel

    this.missionPanels.forEach((panel) => {
      panel.setPosition(x, y);
      const bg = panel.getAt(0) as Phaser.GameObjects.Rectangle;
      y += bg.height + 10;
    });
  }

  private createMissionPanel(
    mission: MissionDef,
  ): Phaser.GameObjects.Container {
    const padding = LayoutConfig.UI.PADDING;
    const panel = this.add.container(0, 0);

    const bg = this.add.rectangle(
      0,
      0,
      LayoutConfig.UI.PANEL_WIDTH,
      100,
      LayoutConfig.COLORS.STANDARD_BG,
      0.95,
    );
    bg.setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT).setStrokeStyle(
      LayoutConfig.UI.PANEL_BORDER_WIDTH,
      LayoutConfig.UI.PANEL_BORDER_COLOR,
      1,
    );

    const title = this.add
      .text(-padding, padding, mission.title, {
        fontSize: LayoutConfig.FONTS.SIZES.HINT,
        fontFamily: LayoutConfig.FONTS.TITLE,
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT);

    let currentY = padding + 28;
    const stepTexts: Phaser.GameObjects.Text[] = [];

    mission.steps.forEach((_step: MissionStepDef) => {
      const t = this.add
        .text(-padding, currentY, "", {
          fontSize: LayoutConfig.FONTS.SIZES.SMALL,
          fontFamily: LayoutConfig.FONTS.BODY,
          color: LayoutConfig.COLORS.WHITE,
          wordWrap: { width: LayoutConfig.UI.PANEL_WIDTH - padding * 2 },
        })
        .setOrigin(...LayoutConfig.ALIGN.TOP_RIGHT);

      stepTexts.push(t);
      currentY += t.displayHeight + 6;
    });

    bg.setSize(LayoutConfig.UI.PANEL_WIDTH, currentY + padding / 2);
    this.missionStepTexts.set(mission.id, stepTexts);
    panel.add([bg, title, ...stepTexts]);

    return panel;
  }

  private refreshMissionSteps(missionId: string) {
    const mission = this.missionDefs[missionId];
    const texts = this.missionStepTexts.get(missionId);
    if (!mission || !texts) return;

    mission.steps.forEach((step: MissionStepDef, idx: number) => {
      const done = this.questManager.hasInfo(missionId, step.infoKey);
      const checkbox = done ? "[✓]" : "[ ]";
      texts[idx].setText(`${checkbox} ${step.text}`);
      texts[idx].setColor(
        done ? LayoutConfig.COLORS.SUCCESS_GREEN : LayoutConfig.COLORS.WHITE,
      );
    });
  }

  // --- MÉTODOS PÚBLICOS (EndGame) ---

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
