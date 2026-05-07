import * as Phaser from "phaser";
import { LayoutConfig } from "../../../constants/LayoutConfig";
import { getNotchedRectPoints } from "./notchedRect";

export type QuizRibbonButtonConfig = {
  width: number;
  height: number;
  notchDepth: number;
  notchHeight: number;
  baseColor: number;
  selectedColor: number;
};

export class QuizRibbonButton extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private checkmark: Phaser.GameObjects.Graphics;
  private cross: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    private config: QuizRibbonButtonConfig,
  ) {
    super(scene, x, y);

    this.bg = scene.add.graphics();
    this.draw(this.config.baseColor);

    this.label = scene.add
      .text(0, 0, text, {
        fontSize: "24px",
        color: LayoutConfig.COLORS.WHITE,
      })
      .setOrigin(0.5);

    this.checkmark = this.createCheckmark().setVisible(false);
    this.cross = this.createCross().setVisible(false);

    this.add([this.bg, this.label, this.checkmark, this.cross]);
    scene.add.existing(this);
  }

  public setText(text: string) {
    this.label.setText(text);
  }

  public setSelected(selected: boolean) {
    const color = selected ? this.config.selectedColor : this.config.baseColor;
    this.draw(color);
    this.setScale(selected ? 1.05 : 1);
  }

  public showFeedback(isCorrect: boolean) {
    this.checkmark.setPosition(-80, 0).setVisible(isCorrect);
    this.cross.setPosition(-80, 0).setVisible(!isCorrect);

    this.draw(isCorrect ? 0x4caf50 : 0xf44336);

    if (isCorrect) {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
        repeat: 1,
      });
      return;
    }

    this.scene.tweens.add({
      targets: this,
      x: "-=8",
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  private draw(color: number) {
    const halfW = this.config.width / 2;
    const halfH = this.config.height / 2;

    this.bg.clear();
    this.bg.fillStyle(color, 1);
    this.bg.fillPoints(
      getNotchedRectPoints(
        0,
        0,
        halfW,
        halfH,
        this.config.notchDepth,
        this.config.notchHeight,
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
}
