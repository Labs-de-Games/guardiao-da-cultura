import type * as Phaser from "phaser";
import { LayoutConfig } from "../constants/LayoutConfig";

const BUBBLE_DEPTH = LayoutConfig.UI.DEPTHS.TUTORIAL;
const BUBBLE_BG_COLOR = LayoutConfig.COLORS.STANDARD_BG;
const BUBBLE_STROKE_COLOR = LayoutConfig.COLORS.WHITE_HEX;
const BUBBLE_ALPHA = 0.92;
const PADDING_X = 16;
const PADDING_Y = 10;
const KEYCAP_SIZE = 28;
const ARROW_SIZE = 10;
const BUBBLE_Y_OFFSET = -60;

export class TutorialBubble {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private keycap: Phaser.GameObjects.Sprite;
  private arrow: Phaser.GameObjects.Triangle;
  private targetX: number;
  private targetY: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    message: string,
    targetX: number,
    targetY: number,
  ) {
    this.targetX = targetX;
    this.targetY = targetY;

    const bubbleX = x;
    const bubbleY = y + BUBBLE_Y_OFFSET;

    this.text = scene.add.text(0, 0, message, {
      fontFamily: LayoutConfig.FONTS.BODY,
      fontSize: `${LayoutConfig.FONTS.SIZES.BODY}px`,
      color: LayoutConfig.COLORS.WHITE,
      fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
    });
    this.text.setOrigin(0.5, 0.5);

    const textW = this.text.width;
    const textH = this.text.height;
    const contentW = textW + PADDING_X * 2 + KEYCAP_SIZE + 8;
    const contentH = textH + PADDING_Y * 2;

    this.bg = scene.add.rectangle(
      0,
      0,
      contentW,
      contentH,
      BUBBLE_BG_COLOR,
      BUBBLE_ALPHA,
    );
    this.bg.setStrokeStyle(2, BUBBLE_STROKE_COLOR, 0.6);

    this.keycap = scene.add.sprite(0, 0, "interactive_hint_key");
    this.keycap.setScale(KEYCAP_SIZE / this.keycap.width);

    const keycapBg = scene.add.rectangle(
      0,
      0,
      KEYCAP_SIZE + 4,
      KEYCAP_SIZE + 4,
      0x333333,
      1,
    );
    keycapBg.setStrokeStyle(1, 0x555555, 0.8);

    const textOffsetX = -(KEYCAP_SIZE / 2 + 4);
    this.text.setPosition(textOffsetX, 0);
    this.keycap.setPosition(textOffsetX + textW / 2 + KEYCAP_SIZE / 2 + 8, 0);
    keycapBg.setPosition(this.keycap.x, this.keycap.y);

    this.arrow = scene.add.triangle(
      0,
      0,
      0,
      0,
      ARROW_SIZE,
      0,
      ARROW_SIZE / 2,
      ARROW_SIZE,
    );
    this.arrow.setFillStyle(BUBBLE_BG_COLOR, BUBBLE_ALPHA);
    this.arrow.setStrokeStyle(2, BUBBLE_STROKE_COLOR, 0.6);

    this.container = scene.add.container(bubbleX, bubbleY);
    this.container.add([this.bg, this.text, keycapBg, this.keycap, this.arrow]);
    this.container.setDepth(BUBBLE_DEPTH);
    this.container.setVisible(false);

    this.updateArrowDirection(bubbleX, bubbleY);
  }

  private updateArrowDirection(bubbleX: number, bubbleY: number) {
    const dx = this.targetX - bubbleX;
    const dy = this.targetY - bubbleY;
    const angle = Math.atan2(dy, dx);

    this.arrow.setPosition(
      Math.cos(angle) * (this.bg.width / 2),
      Math.sin(angle) * (this.bg.height / 2),
    );
    this.arrow.setRotation(angle + Math.PI / 2);
  }

  show() {
    this.container.setVisible(true);
  }

  hide() {
    this.container.setVisible(false);
  }

  destroy() {
    this.container.destroy();
  }
}
