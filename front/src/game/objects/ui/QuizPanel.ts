import * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import type { QuizQuestion } from "../../types/GameDataTypes";
import type { ScoreManager } from "../ScoreManager";
import { BasePanel } from "./BasePanel";
import { QuizProgressTracker } from "./quiz/QuizProgressTracker";
import {
  QuizRibbonButton,
  type QuizRibbonButtonConfig,
} from "./quiz/QuizRibbonButton";

export class QuizPanel extends BasePanel {
  private readonly optionButtonWidth = 524;
  private readonly optionButtonHeight = 100;
  private readonly optionNotchDepth = 30;
  private readonly optionNotchHeight = 20;

  private readonly progressIndicatorWidth = 48;
  private readonly progressIndicatorHeight = 84;
  private readonly progressNotchDepth = 12;
  private readonly progressNotchHeight = 12;

  private questions: QuizQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private selectedOptionIndex: number = 0;
  private score: number = 0;
  private scoreManager: ScoreManager | null = null;
  private onComplete: ((score: number) => void) | null = null;

  private answers: ("correct" | "wrong" | null)[] = [];
  private isProcessingAnswer: boolean = false;

  private optionButtons: QuizRibbonButton[] = [];

  private scoreText: Phaser.GameObjects.Text;
  private questionCounterText: Phaser.GameObjects.Text;
  private progressTracker: QuizProgressTracker;
  private questionText: Phaser.GameObjects.Text;
  private questionTitle: Phaser.GameObjects.Text;
  private footerHintText: Phaser.GameObjects.Text;

  private performanceText: Phaser.GameObjects.Text;
  private performanceStar: Phaser.GameObjects.Image;
  private performanceContainer: Phaser.GameObjects.Container;
  private isShowingPerformance: boolean = false;
  private shouldShowResultsAfterHide: boolean = false;

  private readonly panelWidth = 1200;
  private readonly panelHeight = 800;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.QUIZ || 2000);

    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(...LayoutConfig.ALIGN.CENTER);
    this.bg.setFillStyle(LayoutConfig.COLORS.STANDARD_BG, 0.95);
    this.bg.setStrokeStyle(
      LayoutConfig.UI.PANEL_BORDER_WIDTH,
      LayoutConfig.UI.PANEL_BORDER_COLOR,
      1,
    );

    const topPanel = this.scene.add
      .container(0, -this.bg.height / 2 + 120)
      .setSize(1150, 150);
    const topPanelBg = this.scene.add
      .rectangle(0, 0, 1150, 150, 0x000000)
      .setOrigin(0.5, 0.7)
      .setRounded(16);

    const questionPanel = this.scene.add.container(0, 100).setSize(1150, 250);

    this.scoreText = scene.add
      .text(
        -this.panelWidth / 2 + 40,
        -this.panelHeight / 2 + 30,
        "Pontos: 0",
        {
          fontSize: LayoutConfig.FONTS.SIZES.METADATA,
          fontFamily: LayoutConfig.FONTS.BODY,
          color: LayoutConfig.COLORS.GOLD,
          fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
        },
      )
      .setOrigin(...LayoutConfig.ALIGN.TOP_LEFT);

    this.questionCounterText = scene.add
      .text(
        -this.panelWidth / 2 + 40,
        -this.panelHeight / 2 + 58,
        "Pergunta 01/01",
        {
          fontSize: LayoutConfig.FONTS.SIZES.METADATA,
          fontFamily: LayoutConfig.FONTS.BODY,
          color: LayoutConfig.COLORS.GOLD,
          fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
        },
      )
      .setOrigin(...LayoutConfig.ALIGN.TOP_LEFT);

    this.questionTitle = scene.add
      .text(0, -this.panelHeight / 2 + 110, "Pergunta 01", {
        fontSize: LayoutConfig.FONTS.SIZES.TITLE,
        fontFamily: LayoutConfig.FONTS.TITLE,
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_CENTER);

    this.questionTitle = scene.add
      .text(-410, -this.panelHeight / 2 + 110, "Desafio 01", {
        fontFamily: "Jockey One",
        fontSize: "32px",
        color: LayoutConfig.COLORS.GOLD,
        align: "left",
        wordWrap: { width: 1000, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    this.questionText = scene.add
      .text(0, -this.panelHeight / 2 + 170, "", {
        fontSize: LayoutConfig.FONTS.SIZES.BODY,
        fontFamily: LayoutConfig.FONTS.BODY,
        color: LayoutConfig.COLORS.WHITE,
        align: LayoutConfig.ALIGN.TEXT_CENTER,
        wordWrap: { width: 1000, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_CENTER);

    this.footerHintText = scene.add
      .text(
        0,
        this.panelHeight / 2 - 40,
        "Use as setas e pressione Espaço para confirmar",
        {
          fontSize: LayoutConfig.FONTS.SIZES.HINT,
          fontFamily: LayoutConfig.FONTS.BODY,
          color: LayoutConfig.COLORS.HINT_GREY,
        },
      )
      .setOrigin(...LayoutConfig.ALIGN.BOTTOM_CENTER);

    this.progressTracker = new QuizProgressTracker(scene, 64, -12, {
      indicatorWidth: this.progressIndicatorWidth,
      indicatorHeight: this.progressIndicatorHeight,
      notchDepth: this.progressNotchDepth,
      notchHeight: this.progressNotchHeight,
      gap: 16,
    });

    topPanel.add([
      topPanelBg,
      this.scoreText,
      this.questionCounterText,
      this.progressTracker,
    ]);

    questionPanel.add([this.questionTitle, this.questionText]);

    // Performance display (initially hidden)
    this.performanceContainer = this.scene.add.container(0, 80);
    this.performanceText = this.scene.add
      .text(0, -100, "Quiz completo!", {
        fontFamily: "Jockey One",
        fontSize: "48px",
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5);

    this.performanceStar = this.scene.add
      .image(0, 50, "ui_star_full")
      .setScale(1);
    this.performanceContainer.add([this.performanceText, this.performanceStar]);
    this.performanceContainer.setVisible(false);

    this.add([
      this.bg,
      topPanel,
      questionPanel,
      this.footerHintText,
      this.performanceContainer,
    ]);

    this.bindKey("W", () => this.moveVertical(-1));
    this.bindKey("UP", () => this.moveVertical(-1));
    this.bindKey("S", () => this.moveVertical(1));
    this.bindKey("DOWN", () => this.moveVertical(1));
    this.bindKey("A", () => this.moveHorizontal(-1));
    this.bindKey("LEFT", () => this.moveHorizontal(-1));
    this.bindKey("D", () => this.moveHorizontal(1));
    this.bindKey("RIGHT", () => this.moveHorizontal(1));
    this.bindKey("ESC", () => {
      if (!this._isVisible) return;
      this.hide();
    });
    this.bindKey("SPACE", () => {
      if (this.isShowingPerformance) {
        this.handlePerformanceSpace();
      } else {
        this.selectOption();
      }
    });
    this.bindKey("ENTER", () => this.selectOption());
  }

  public startQuiz(
    questions: QuizQuestion[],
    scoreManager: ScoreManager,
    onComplete: (score: number) => void,
  ) {
    this.questions = questions;
    this.onComplete = onComplete;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.selectedOptionIndex = 0;
    this.isProcessingAnswer = false;
    this.scoreManager = scoreManager;

    this.answers = new Array(questions.length).fill(null);
    this.progressTracker.setCount(questions.length);
    this.progressTracker.setAnswers(this.answers);

    this.footerHintText.setText(
      "Use as setas e pressione Espaço para confirmar",
    );

    this.showQuestion();
    this.show();
  }

  public override show() {
    if (this._isVisible) return;
    super.show();

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
  }

  public override hide(duration: number = 200, onComplete?: () => void) {
    if (!this._isVisible) return;

    this.isShowingPerformance = false;
    this.performanceContainer.setVisible(false);
    // Restore question UI visibility for next quiz
    this.questionTitle.setVisible(true);
    this.questionText.setVisible(true);

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

    super.hide(duration, () => {
      if (onComplete) onComplete();
      if (this.onComplete) {
        const finalScore = this.score;
        this.onComplete(finalScore);
        this.onComplete = null;

        // Emit SHOW_QUIZ_RESULTS AFTER recordQuizResult has been called
        // (recordQuizResult is called in the onComplete callback above)
        if (this.shouldShowResultsAfterHide) {
          this.shouldShowResultsAfterHide = false;
          const gameScene = this.scene.scene.get(SceneNames.GAME);
          gameScene.events.emit(
            GameEvents.SHOW_QUIZ_RESULTS,
            this.score,
            this.questions.length,
            this.progressTracker,
            this.scoreManager,
          );
        }
      }
    });
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
  }

  private positionProgressTracker() {
    const totalWidth = this.progressTracker.getTotalWidth();
    if (totalWidth === 0) return;
    const leftBlockWidth = Math.max(
      this.scoreText.displayWidth,
      this.questionCounterText.displayWidth,
    );
    const startX = -500 + leftBlockWidth + 30;
    const y = -60;

    this.progressTracker.layout(startX, y);
  }

  private updateProgressTracker() {
    this.progressTracker.setAnswers(this.answers);
  }

  private calculateStarFillLevel(): string {
    const percentage = (this.score / this.questions.length) * 100;
    if (percentage > 90) return "ui_star_full";
    if (percentage > 70) return "ui_star_3q";
    if (percentage > 50) return "ui_star_2q";
    return "ui_star_1q";
  }

  private calculateResultStarScale(): number {
    const tex = this.scene.textures.get("ui_star_full");
    const source = tex?.getSourceImage() as
      | { width: number; height: number }
      | undefined;
    const baseW = source?.width ?? 457;

    const panelWidth = 1200; // Match ResultPanel.panelWidth
    const sidePadding = 140; // Match ResultPanel.resultStarsSidePadding
    const starCount = 5; // Match ResultPanel.resultStarsCount
    const gapRatio = 0.18; // Match ResultPanel.resultStarsGapRatio

    const maxRowWidth = Math.max(0, panelWidth - sidePadding * 2);
    const denom = starCount + (starCount - 1) * gapRatio;
    const targetW = denom > 0 ? maxRowWidth / denom : maxRowWidth;
    const scale = baseW > 0 ? targetW / baseW : 1;

    return scale;
  }

  private showFinalPerformance() {
    this.isShowingPerformance = true;

    // Hide question UI
    this.questionTitle.setVisible(false);
    this.questionText.setVisible(false);
    this.optionButtons.forEach((b) => {
      b.destroy(true);
    });
    this.optionButtons = [];

    // Calculate percentage
    const percentage = (this.score / this.questions.length) * 100;

    // Update text based on performance
    if (percentage < 70) {
      this.scoreText.setText("Por pouco");
      this.questionCounterText.setText("Pontuação baixa");
      this.performanceText.setText("Quase lá...");
    } else if (percentage < 90) {
      // Corrected: 70% and above uses "Parabéns!" for scoreText
      this.scoreText.setText("Parabéns!");
      this.questionCounterText.setText("Boa pontuação");
      this.performanceText.setText("Muito bom");
    } else {
      this.scoreText.setText("Parabéns!");
      this.questionCounterText.setText("Pontuação perfeita!");
      this.performanceText.setText("Perfeito");
    }

    // Show performance UI
    this.performanceContainer.setVisible(true);
    this.performanceStar.setTexture(this.calculateStarFillLevel());
    this.performanceStar.setScale(this.calculateResultStarScale());

    // Update footer hint
    if (percentage >= 70) {
      this.footerHintText.setText("Pressione Espaço para ver resultados");
    } else {
      this.footerHintText.setText("Pressione Espaço para fechar");
    }
  }

  private handlePerformanceSpace() {
    const percentage = (this.score / this.questions.length) * 100;

    if (percentage >= 70) {
      // Pass - emit SHOW_QUIZ_RESULTS after QuizPanel is fully hidden
      // The Game.ts callback will handle the emit after recordQuizResult
      this.shouldShowResultsAfterHide = true;
    }

    this.hide();
  }

  private updateSelectionVisuals() {
    for (let i = 0; i < this.optionButtons.length; i++) {
      const b = this.optionButtons[i];
      b.setSelected(i === this.selectedOptionIndex);
    }
  }

  private showAnswerFeedback(optionIndex: number, isCorrect: boolean) {
    this.optionButtons[optionIndex]?.showFeedback(isCorrect);
  }

  private showQuestion() {
    const question = this.questions[this.currentQuestionIndex];
    if (!question) return;

    this.selectedOptionIndex = 0;

    this.optionButtons.forEach((b) => {
      b.destroy(true);
    });
    this.optionButtons = [];

    this.questionTitle.setText(
      `Desafio ${String(this.currentQuestionIndex + 1).padStart(2, "0")}`,
    );
    this.questionText.setText(question.question);
    this.scoreText.setText(`Pontos: ${this.score}`);
    this.questionCounterText.setText(
      `Pergunta ${String(this.currentQuestionIndex + 1).padStart(2, "0")}/${String(this.questions.length).padStart(2, "0")}`,
    );

    this.positionProgressTracker();
    this.progressTracker.setCurrentIndex(this.currentQuestionIndex);
    this.updateProgressTracker();

    const options = question.options.slice(0, 4);
    const colGap = 50;
    const rowGap = 22;

    const leftX = -this.optionButtonWidth / 2 - colGap / 2;
    const rightX = this.optionButtonWidth / 2 + colGap / 2;
    const startY = this.questionText.y + this.questionText.displayHeight + 100;
    const topY = startY;
    const bottomY = startY + this.optionButtonHeight + rowGap;
    const positions: { x: number; y: number }[] = [
      { x: leftX, y: topY },
      { x: leftX, y: bottomY },
      { x: rightX, y: topY },
      { x: rightX, y: bottomY },
    ];

    const buttonCfg: QuizRibbonButtonConfig = {
      width: this.optionButtonWidth,
      height: this.optionButtonHeight,
      notchDepth: this.optionNotchDepth,
      notchHeight: this.optionNotchHeight,
      baseColor: LayoutConfig.COLORS.GOLD_DARK_HEX,
      selectedColor: LayoutConfig.COLORS.GOLD_HEX,
    };

    const buttonPanel = this.scene.add.container(0, 80);

    for (let i = 0; i < options.length; i++) {
      const pos = positions[i];
      const btn = new QuizRibbonButton(this.scene, pos.x, pos.y, options[i], {
        ...buttonCfg,
      });
      this.optionButtons.push(btn);
      buttonPanel.add(btn);
    }
    this.add(buttonPanel);

    this.updateSelectionVisuals();
  }

  private moveHorizontal(dir: number) {
    this.moveSelection(0, dir);
  }

  private moveVertical(dir: number) {
    this.moveSelection(dir, 0);
  }

  private moveSelection(dRow: number, dCol: number) {
    if (!this._isVisible) return;
    if (this.isProcessingAnswer) return;
    if (this.optionButtons.length === 0) return;

    const row = this.selectedOptionIndex % 2;
    const col = this.selectedOptionIndex >= 2 ? 1 : 0;

    const nextRow = Phaser.Math.Wrap(row + dRow, 0, 2);
    const nextCol = Phaser.Math.Wrap(col + dCol, 0, 2);
    const nextIndex = nextCol * 2 + nextRow;

    if (nextIndex >= this.optionButtons.length) return;
    this.selectedOptionIndex = nextIndex;
    this.updateSelectionVisuals();
  }

  private selectOption() {
    if (!this._isVisible) return;
    if (this.isProcessingAnswer) return;

    if (this.optionButtons.length === 0) return;

    const question = this.questions[this.currentQuestionIndex];
    const isCorrect = this.selectedOptionIndex === question.correctOptionIndex;

    if (isCorrect) {
      this.score++;
      this.answers[this.currentQuestionIndex] = "correct";
    } else {
      this.answers[this.currentQuestionIndex] = "wrong";
    }

    this.showAnswerFeedback(this.selectedOptionIndex, isCorrect);

    this.isProcessingAnswer = true;

    this.scene.time.delayedCall(500, () => {
      this.isProcessingAnswer = false;
      this.currentQuestionIndex++;
      if (this.currentQuestionIndex < this.questions.length) {
        this.showQuestion();
      } else {
        this.showFinalPerformance();
      }
    });
  }
}
