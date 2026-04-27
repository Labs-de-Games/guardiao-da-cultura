import * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import type { QuizQuestion } from "../../types/GameDataTypes";
import { BasePanel } from "./BasePanel";

export class QuizPanel extends BasePanel {
  private questions: QuizQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private selectedOptionIndex: number = 0;
  private score: number = 0;
  private onComplete: ((score: number) => void) | null = null;

  private questionText: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];

  private readonly panelWidth = 1100;
  private readonly panelHeight = 750;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.QUIZ || 2000);

    this.bg = this.createStandardBg(this.panelWidth, this.panelHeight);
    this.bg.setOrigin(0.5, 0.5);
    this.bg.setStrokeStyle(6, 0xffffff, 1);

    this.questionText = scene.add
      .text(0, -this.panelHeight / 2 + 60, "", {
        fontSize: "40px",
        color: LayoutConfig.COLORS.WHITE,
        align: "center",
        wordWrap: { width: 1000, useAdvancedWrap: true },
      })
      .setOrigin(0.5, 0);

    this.escHint = this.createKeyHint("ESC para fechar");
    this.escHint.setOrigin(0, 1);
    this.escHint.setPosition(
      -this.panelWidth / 2 + 40,
      this.panelHeight / 2 - 40,
    );

    this.add([this.bg, this.questionText, this.escHint]);

    this.bindKey("W", () => this.moveSelection(-1));
    this.bindKey("UP", () => this.moveSelection(-1));
    this.bindKey("S", () => this.moveSelection(1));
    this.bindKey("DOWN", () => this.moveSelection(1));
    this.bindKey("SPACE", () => this.selectOption());
    this.bindKey("ENTER", () => this.selectOption());
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

  private showQuestion() {
    const question = this.questions[this.currentQuestionIndex];
    this.questionText.setText(question.question);

    this.optionTexts.forEach((t) => {
      t.destroy();
    });
    this.optionTexts = [];
    this.selectedOptionIndex = 0;

    const startY = -60;
    const spacing = 85;

    question.options.forEach((opt, idx) => {
      const optText = this.scene.add
        .text(0, startY + idx * spacing, opt, {
          fontSize: "32px",
          color:
            idx === 0 ? LayoutConfig.COLORS.GOLD : LayoutConfig.COLORS.WHITE,
        })
        .setOrigin(0.5);

      this.optionTexts.push(optText);
      this.add(optText);
    });
  }

  private moveSelection(dir: number) {
    if (!this._isVisible) return;
    this.selectedOptionIndex = Phaser.Math.Wrap(
      this.selectedOptionIndex + dir,
      0,
      this.optionTexts.length,
    );

    this.optionTexts.forEach((text, idx) => {
      text.setColor(
        idx === this.selectedOptionIndex
          ? LayoutConfig.COLORS.GOLD
          : LayoutConfig.COLORS.WHITE,
      );
      text.setScale(idx === this.selectedOptionIndex ? 1.1 : 1);
    });
  }

  private selectOption() {
    if (!this._isVisible) return;
    const question = this.questions[this.currentQuestionIndex];
    const isCorrect = this.selectedOptionIndex === question.correctOptionIndex;

    if (isCorrect) {
      this.score++;
      this.flash(LayoutConfig.COLORS.SUCCESS_GREEN || 0x00ff00);
    } else {
      this.flash(LayoutConfig.COLORS.DANGER_RED || 0xff0000);
    }

    this.scene.time.delayedCall(500, () => {
      if (!this._isVisible) return;
      this.currentQuestionIndex++;
      if (this.currentQuestionIndex < this.questions.length) {
        this.showQuestion();
      } else {
        this.hide();
      }
    });
  }

  private flash(color: number | string) {
    const hexColor =
      typeof color === "string"
        ? parseInt(color.replace("#", "0x"), 16)
        : color;
    this.bg.setStrokeStyle(6, hexColor);
    this.scene.time.delayedCall(300, () => {
      if (this.bg?.active) this.bg.setStrokeStyle(6, 0xffffff);
    });
  }
}
