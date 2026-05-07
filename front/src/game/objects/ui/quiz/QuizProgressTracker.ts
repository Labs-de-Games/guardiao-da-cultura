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

  private redraw() {
    for (let i = 0; i < this.indicators.length; i++) {
      const g = this.indicators[i];
      g.clear();

      const state = this.answers[i] ?? null;
      const fill =
        state === "correct"
          ? 0x4caf50
          : state === "wrong"
            ? 0xf44336
            : 0x4a4a4a;
      g.fillStyle(fill, 1);

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
  }
}
