import * as Phaser from "phaser";
import { getNotchedRectPoints } from "./notchedRect";

export type QuizAnswerState = "correct" | "wrong" | null;

export type QuizProgressTrackerConfig = {
  indicatorWidth: number;
  indicatorHeight: number;
  notchDepth: number;
  notchHeight: number;
  gap: number;
};

export class QuizProgressTracker extends Phaser.GameObjects.Container {
  private indicators: Phaser.GameObjects.Graphics[] = [];
  private answers: QuizAnswerState[] = [];
  private currentIndex: number = -1;

  private static readonly COLOR_CURRENT = 0xd0db00; // yellow - current question
  private static readonly COLOR_CORRECT = 0x4caf50; // green - correct
  private static readonly COLOR_WRONG = 0xf44336; // red - wrong
  private static readonly COLOR_FUTURE = 0x4a4a4a; // grey - not yet reached

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private config: QuizProgressTrackerConfig,
  ) {
    super(scene, x, y);
    scene.add.existing(this);
  }

  public setCount(count: number) {
    for (const g of this.indicators) g.destroy();
    this.indicators = [];

    const n = Math.max(0, Math.floor(count));
    for (let i = 0; i < n; i++) {
      const g = this.scene.add.graphics();
      this.indicators.push(g);
      this.add(g);
    }
  }

  public setAnswers(answers: QuizAnswerState[]) {
    this.answers = answers;
    this.redraw();
  }

  public setCurrentIndex(index: number) {
    this.currentIndex = index;
    this.redraw();
  }

  finishTracker(index: number) {
    this.currentIndex = index;
    this.redraw();
  }

  public layout(startX: number, y: number) {
    for (let i = 0; i < this.indicators.length; i++) {
      this.indicators[i].setPosition(
        startX + i * (this.config.indicatorWidth + this.config.gap),
        y,
      );
    }
  }

  public getTotalWidth(): number {
    const count = this.indicators.length;
    if (count <= 0) return 0;
    return count * this.config.indicatorWidth + (count - 1) * this.config.gap;
  }

  private shapeButton(g: Phaser.GameObjects.Graphics) {
    const halfW = this.config.indicatorWidth / 2;
    const halfH = this.config.indicatorHeight / 2;
    g.fillPoints(
      getNotchedRectPoints(
        halfW,
        halfH,
        halfW,
        halfH,
        this.config.notchDepth,
        this.config.notchHeight,
      ),
      true,
    );
  }

  private redraw() {
    for (let i = 0; i < this.indicators.length; i++) {
      const g = this.indicators[i];
      g.clear();

      const isCurrent = i === this.currentIndex;
      const isFuture = i > this.currentIndex;
      const state = this.answers[i] ?? null;

      if (isCurrent) g.fillStyle(QuizProgressTracker.COLOR_CURRENT, 1);
      else if (isFuture) g.fillStyle(QuizProgressTracker.COLOR_FUTURE, 1);
      else if (state === "correct")
        g.fillStyle(QuizProgressTracker.COLOR_CORRECT, 1);
      else g.fillStyle(QuizProgressTracker.COLOR_WRONG, 1);
      this.shapeButton(g);
    }
    if (this.currentIndex === 10) {
      const g = this.indicators[9];
      g.clear();
      const state = this.answers[9] ?? null;
      if (state === "correct")
        g.fillStyle(QuizProgressTracker.COLOR_CORRECT, 1);
      else g.fillStyle(QuizProgressTracker.COLOR_WRONG, 1);
      this.shapeButton(g);
    }
  }
}
