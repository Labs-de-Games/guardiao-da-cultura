import * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import type { QuizQuestion } from "../../types/GameDataTypes";
import { BasePanel } from "./BasePanel";

export class QuizPanel extends BasePanel {
  private readonly optionButtonWidth = 460;
  private readonly optionButtonHeight = 68;
  private readonly optionNotchDepth = 30;
  private readonly optionNotchHeight = 20;

  private readonly progressIndicatorWidth = 24;
  private readonly progressIndicatorHeight = 48;
  private readonly progressNotchDepth = 6;
  private readonly progressNotchHeight = 6;

  private questions: QuizQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private selectedOptionIndex: number = 0;
  private score: number = 0;
  private onComplete: ((score: number) => void) | null = null;

  private mode: "quiz" | "results" = "quiz";

  private answers: ("correct" | "wrong" | null)[] = [];
  private isProcessingAnswer: boolean = false;

  private optionButtons: {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    checkmark: Phaser.GameObjects.Graphics;
    cross: Phaser.GameObjects.Graphics;
  }[] = [];

  private scoreText: Phaser.GameObjects.Text;
  private questionCounterText: Phaser.GameObjects.Text;
  private progressIndicators: Phaser.GameObjects.Graphics[] = [];
  private questionTitleText: Phaser.GameObjects.Text;
  private questionText: Phaser.GameObjects.Text;
  private footerHintText: Phaser.GameObjects.Text;

  private resultTitleText: Phaser.GameObjects.Text;
  private resultSummaryText: Phaser.GameObjects.Text;

  private readonly panelWidth = 1200;
  private readonly panelHeight = 800;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.QUIZ || 2000);

    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setFillStyle(0x1a1a1a, 0.95);
    this.bg.setStrokeStyle(4, 0xffffff, 1);

    this.scoreText = scene.add
      .text(
        -this.panelWidth / 2 + 40,
        -this.panelHeight / 2 + 30,
        "Pontos: 0",
        {
          fontSize: "20px",
          color: LayoutConfig.COLORS.GOLD,
          fontStyle: "bold",
        },
      )
      .setOrigin(0, 0);

    this.questionCounterText = scene.add
      .text(
        -this.panelWidth / 2 + 40,
        -this.panelHeight / 2 + 58,
        "Pergunta 01/01",
        {
          fontSize: "20px",
          color: LayoutConfig.COLORS.GOLD,
          fontStyle: "bold",
        },
      )
      .setOrigin(0, 0);

    this.questionTitleText = scene.add
      .text(0, -this.panelHeight / 2 + 110, "Pergunta 01", {
        fontSize: "36px",
        color: LayoutConfig.COLORS.GOLD,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.questionText = scene.add
      .text(0, -this.panelHeight / 2 + 170, "", {
        fontSize: "28px",
        color: LayoutConfig.COLORS.WHITE,
        align: "center",
        wordWrap: { width: 1000, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0);

    this.footerHintText = scene.add
      .text(
        0,
        this.panelHeight / 2 - 40,
        "Use as setas e pressione Espaço para confirmar",
        {
          fontSize: "18px",
          color: "#888888",
        },
      )
      .setOrigin(0.5, 1);

    this.resultTitleText = scene.add
      .text(0, -this.panelHeight / 2 + 110, "Resultado", {
        fontSize: "48px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.resultSummaryText = scene.add
      .text(0, -this.panelHeight / 2 + 190, "", {
        fontSize: "32px",
        color: LayoutConfig.COLORS.WHITE,
        align: "center",
        wordWrap: { width: 1000, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0)
      .setVisible(false);

    this.add([
      this.bg,
      this.questionText,
      this.scoreText,
      this.questionCounterText,
      this.questionTitleText,
      this.footerHintText,
      this.resultTitleText,
      this.resultSummaryText,
    ]);

    this.bindKey("W", () => this.moveVertical(-1));
    this.bindKey("UP", () => this.moveVertical(-1));
    this.bindKey("S", () => this.moveVertical(1));
    this.bindKey("DOWN", () => this.moveVertical(1));
    this.bindKey("A", () => this.moveHorizontal(-1));
    this.bindKey("LEFT", () => this.moveHorizontal(-1));
    this.bindKey("D", () => this.moveHorizontal(1));
    this.bindKey("RIGHT", () => this.moveHorizontal(1));
    // ESC should not close during quiz questions; only allow closing on results.
    this.bindKey("ESC", () => {
      if (!this._isVisible) return;
      if (this.mode !== "results") return;
      this.hide();
    });
    this.bindKey("SPACE", () => this.selectOption());
    this.bindKey("ENTER", () => this.selectOption());
  }

  private getNotchedRectPoints(
    centerX: number,
    centerY: number,
    halfW: number,
    halfH: number,
    notchDepth: number,
    notchHeight: number,
  ): { x: number; y: number }[] {
    return [
      { x: centerX - halfW + notchDepth, y: centerY - halfH },
      {
        x: centerX - halfW + notchDepth,
        y: centerY - halfH + notchHeight,
      },
      { x: centerX - halfW, y: centerY - halfH + notchHeight },
      { x: centerX - halfW, y: centerY + halfH - notchHeight },
      {
        x: centerX - halfW + notchDepth,
        y: centerY + halfH - notchHeight,
      },
      { x: centerX - halfW + notchDepth, y: centerY + halfH },
      { x: centerX + halfW - notchDepth, y: centerY + halfH },
      {
        x: centerX + halfW - notchDepth,
        y: centerY + halfH - notchHeight,
      },
      { x: centerX + halfW, y: centerY + halfH - notchHeight },
      { x: centerX + halfW, y: centerY - halfH + notchHeight },
      {
        x: centerX + halfW - notchDepth,
        y: centerY - halfH + notchHeight,
      },
      { x: centerX + halfW - notchDepth, y: centerY - halfH },
    ];
  }

  public startQuiz(
    questions: QuizQuestion[],
    onComplete: (score: number) => void,
  ) {
    this.questions = questions;
    this.onComplete = onComplete;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.selectedOptionIndex = 0;
    this.isProcessingAnswer = false;
    this.mode = "quiz";

    this.answers = new Array(questions.length).fill(null);
    this.createProgressTracker(questions.length);

    this.setQuizUiVisible(true);
    this.setResultsUiVisible(false);
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

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

    super.hide(duration, () => {
      if (onComplete) onComplete();
      if (this.onComplete) {
        const finalScore = this.score;
        this.onComplete(finalScore);
        this.onComplete = null;
      }
    });
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
  }

  private createProgressTracker(count: number) {
    for (const g of this.progressIndicators) {
      g.destroy();
    }
    this.progressIndicators = [];

    for (let i = 0; i < count; i++) {
      const g = this.scene.add.graphics();
      this.progressIndicators.push(g);
      this.add(g);
    }
  }

  private positionProgressTracker() {
    const count = this.progressIndicators.length;
    if (count === 0) return;

    const gap = 8;
    const totalWidth = count * this.progressIndicatorWidth + (count - 1) * gap;
    const leftX = -this.panelWidth / 2 + 40;
    const leftBlockWidth = Math.max(
      this.scoreText.displayWidth,
      this.questionCounterText.displayWidth,
    );
    const desiredStartX = leftX + leftBlockWidth + 30;
    const maxStartX = this.panelWidth / 2 - 40 - totalWidth;
    const startX = Math.min(desiredStartX, maxStartX);
    const y = -this.panelHeight / 2 + 30;

    for (let i = 0; i < count; i++) {
      this.progressIndicators[i].setPosition(
        startX + i * (this.progressIndicatorWidth + gap),
        y,
      );
    }
  }

  private updateProgressTracker() {
    for (let i = 0; i < this.progressIndicators.length; i++) {
      const g = this.progressIndicators[i];
      g.clear();

      const state = this.answers[i];
      const fill =
        state === "correct"
          ? 0x4caf50
          : state === "wrong"
            ? 0xf44336
            : 0x4a4a4a;
      g.fillStyle(fill, 1);
      const halfW = this.progressIndicatorWidth / 2;
      const halfH = this.progressIndicatorHeight / 2;
      const cx = halfW;
      const cy = halfH;
      g.fillPoints(
        this.getNotchedRectPoints(
          cx,
          cy,
          halfW,
          halfH,
          this.progressNotchDepth,
          this.progressNotchHeight,
        ),
        true,
      );
    }
  }

  private drawRibbon(
    g: Phaser.GameObjects.Graphics,
    width: number,
    height: number,
    color: number,
  ) {
    const halfW = width / 2;
    const halfH = height / 2;

    g.clear();
    g.fillStyle(color, 1);
    g.fillPoints(
      this.getNotchedRectPoints(
        0,
        0,
        halfW,
        halfH,
        this.optionNotchDepth,
        this.optionNotchHeight,
      ),
      true,
    );
  }

  private createCheckmark(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.lineStyle(5, 0x4caf50);
    g.lineBetween(-14, 0, -2, 14);
    g.lineBetween(-2, 14, 18, -12);
    return g;
  }

  private createCross(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.lineStyle(5, 0xf44336);
    g.lineBetween(-12, -12, 12, 12);
    g.lineBetween(12, -12, -12, 12);
    return g;
  }

  private createRibbonButton(x: number, y: number, text: string) {
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    this.drawRibbon(
      bg,
      this.optionButtonWidth,
      this.optionButtonHeight,
      0xd4a853,
    );

    const label = this.scene.add
      .text(0, 0, text, {
        fontSize: "24px",
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(0.5);

    const checkmark = this.createCheckmark().setVisible(false);
    const cross = this.createCross().setVisible(false);

    container.add([bg, label, checkmark, cross]);
    this.add(container);

    return { container, bg, label, checkmark, cross };
  }

  private updateSelectionVisuals() {
    for (let i = 0; i < this.optionButtons.length; i++) {
      const b = this.optionButtons[i];
      const selected = i === this.selectedOptionIndex;
      const color = selected ? 0xf0c060 : 0xd4a853;
      this.drawRibbon(
        b.bg,
        this.optionButtonWidth,
        this.optionButtonHeight,
        color,
      );
      b.container.setScale(selected ? 1.05 : 1);
    }
  }

  private showAnswerFeedback(optionIndex: number, isCorrect: boolean) {
    const b = this.optionButtons[optionIndex];
    b.checkmark.setPosition(-80, 0).setVisible(isCorrect);
    b.cross.setPosition(-80, 0).setVisible(!isCorrect);

    this.drawRibbon(
      b.bg,
      this.optionButtonWidth,
      this.optionButtonHeight,
      isCorrect ? 0x4caf50 : 0xf44336,
    );

    if (isCorrect) {
      this.scene.tweens.add({
        targets: b.container,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
        repeat: 1,
      });
      return;
    }

    this.scene.tweens.add({
      targets: b.container,
      x: "-=8",
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  private showQuestion() {
    const question = this.questions[this.currentQuestionIndex];
    if (!question) return;

    this.selectedOptionIndex = 0;

    this.optionButtons.forEach((b) => {
      b.container.destroy(true);
    });
    this.optionButtons = [];

    this.questionTitleText.setText(
      `Pergunta ${String(this.currentQuestionIndex + 1).padStart(2, "0")}`,
    );
    this.questionText.setText(question.question);
    this.scoreText.setText(`Pontos: ${this.score}`);
    this.questionCounterText.setText(
      `Pergunta ${String(this.currentQuestionIndex + 1).padStart(2, "0")}/${String(this.questions.length).padStart(2, "0")}`,
    );

    this.positionProgressTracker();

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

    for (let i = 0; i < options.length; i++) {
      const pos = positions[i];
      this.optionButtons.push(
        this.createRibbonButton(pos.x, pos.y, options[i]),
      );
    }

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

    if (this.mode === "results") {
      this.hide();
      return;
    }

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
        this.showResults();
      }
    });
  }

  private setQuizUiVisible(visible: boolean) {
    this.scoreText.setVisible(visible);
    this.questionCounterText.setVisible(visible);
    this.questionTitleText.setVisible(visible);
    this.questionText.setVisible(visible);
  }

  private setResultsUiVisible(visible: boolean) {
    this.resultTitleText.setVisible(visible);
    this.resultSummaryText.setVisible(visible);
  }

  private showResults() {
    this.mode = "results";

    this.optionButtons.forEach((b) => {
      b.container.destroy(true);
    });
    this.optionButtons = [];

    const total = this.questions.length;
    const required = Math.ceil(total * 0.7);
    const passed = this.score >= required;

    this.setQuizUiVisible(false);
    this.setResultsUiVisible(true);

    this.footerHintText.setText("Pressione Espaço ou ESC para fechar");

    this.resultTitleText.setText("Resultado");
    this.resultTitleText.setColor(passed ? "#4caf50" : "#f44336");
    this.resultSummaryText.setText(`Você acertou ${this.score} de ${total}`);

    this.positionProgressTracker();
    this.updateProgressTracker();
  }
}
