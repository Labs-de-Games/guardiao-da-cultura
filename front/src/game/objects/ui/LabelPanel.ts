import * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import type { LabelInfoData } from "../../types/GameDataTypes";
import { BasePanel } from "./BasePanel";

export class LabelPanel extends BasePanel {
  private lines: Phaser.GameObjects.Graphics;

  private titleText: Phaser.GameObjects.Text;
  private descText: Phaser.GameObjects.Text;
  private descMaskGraphics: Phaser.GameObjects.Graphics;

  private rightTexts: Phaser.GameObjects.Text[] = [];
  private escHint: Phaser.GameObjects.Text;

  private labelData: LabelInfoData | null = null;
  private panelWidth: number = 1000;
  private panelHeight: number = 600;

  private descArea = { x: 0, y: 0, width: 0, height: 0 };
  private descScrollY: number = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.DIALOGUE + 5);

    this.bg = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 1);
    this.bg.setStrokeStyle(4, 0x000000, 1);
    this.bg.setOrigin(0.5);

    this.lines = scene.add.graphics();

    this.titleText = scene.add
      .text(0, 0, "", {
        fontFamily: "Jockey One",
        fontSize: "60px",
        color: "#000000",
        wordWrap: { width: 800, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    this.descText = scene.add
      .text(0, 0, "", {
        fontFamily: "Inter",
        fontSize: "25px",
        fontStyle: "bold",
        color: "#000000",
        wordWrap: { width: 600, useAdvancedWrap: true },
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    // Mask removed - was causing text to not display
    this.descMaskGraphics = scene.add.graphics();
    this.descMaskGraphics.setVisible(false);

    this.escHint = this.createKeyHint("ESC para fechar", "#000000");
    this.escHint.setOrigin(1, 0);
    this.escHint.setFontSize("16px");
    this.escHint.setFontFamily("Inter");
    this.escHint.setFontStyle("bold");

    this.add([
      this.bg,
      this.lines,
      this.titleText,
      this.descText,
      this.descMaskGraphics,
      this.escHint,
    ]);

    this.bindKey("ESC", () => this.hide());
    this.bindKey("SPACE", () => this.hide());
    this.bindKey("UP", () => this.scrollDescription(-40));
    this.bindKey("DOWN", () => this.scrollDescription(40));

    this.scene.input.on("wheel", this.onWheel, this);
  }

  public showLabel(data: LabelInfoData) {
    this.labelData = data;
    this.updateContent();
    this.show();

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_STARTED);
  }

  public override hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.DIALOGUE_ENDED);

    super.hide(duration, onComplete);
  }

  public layout(w: number, h: number) {
    this.panelWidth = Math.min(1200, Math.floor(w * 0.92));
    this.panelHeight = Math.min(720, Math.floor(h * 0.82));

    this.setPosition(w / 2, h / 2);
    this.bg.setSize(this.panelWidth, this.panelHeight);

    this.updateContent();
  }

  private updateContent() {
    if (!this.labelData) return;

    const padding = 26;
    const titleHeight = 110;
    const lineThickness = 5;

    const left = -this.panelWidth / 2;
    const top = -this.panelHeight / 2;
    const right = this.panelWidth / 2;
    const bottom = this.panelHeight / 2;

    const bodyTop = top + titleHeight;
    const bodyHeight = bottom - bodyTop;

    const fields = this.buildRightFields(this.labelData);
    this.ensureRightTextCount(fields.length);

    const hasRightColumn = fields.length > 0;
    const rightWidth = hasRightColumn
      ? Math.min(360, Math.floor(this.panelWidth * 0.32))
      : 0;

    const columnGap = hasRightColumn ? 20 : 0;
    const bodyLeft = left + padding;
    const bodyRight = right - padding;
    const rightLeft = bodyRight - rightWidth;
    const descRight = hasRightColumn ? rightLeft - columnGap : bodyRight;

    const descTop = bodyTop + padding;
    const descBottom = bottom - padding;
    const descWidth = descRight - bodyLeft;
    const descHeight = descBottom - descTop;

    this.titleText.setPosition(left + padding, top + padding);
    this.titleText.setWordWrapWidth(this.panelWidth - padding * 2, true);

    // Reduce font size if title exceeds 50 characters
    const titleLength = this.labelData.title.length;
    if (titleLength > 50) {
      this.titleText.setFontSize("45px");
    } else {
      this.titleText.setFontSize("60px");
    }

    this.titleText.setText(this.labelData.title);

    this.escHint.setPosition(right - 12, top + 12);

    this.descArea = {
      x: bodyLeft,
      y: descTop,
      width: Math.max(descWidth, 0),
      height: Math.max(descHeight, 0),
    };

    this.descText.setPosition(this.descArea.x, this.descArea.y);
    this.descText.setWordWrapWidth(this.descArea.width, true);
    this.descText.setText(this.labelData.description || "");

    this.resetDescriptionScroll();

    this.lines.clear();
    this.lines.lineStyle(lineThickness, 0x000000, 1);

    // Horizontal line separating title from body
    this.lines.lineBetween(left, bodyTop, right, bodyTop);

    if (hasRightColumn) {
      const dividerX = descRight + columnGap / 2;
      this.lines.lineBetween(dividerX, bodyTop, dividerX, bottom);

      const rowHeight = bodyHeight / fields.length;
      fields.forEach((value, index) => {
        const text = this.rightTexts[index];
        const rowTop = bodyTop + rowHeight * index;
        const rowCenterY = rowTop + rowHeight / 2;

        text.setText(value);
        text.setPosition(rightLeft + 14, rowCenterY);
        text.setWordWrapWidth(rightWidth - 28, true);
        text.setOrigin(0, 0.5);

        if (index > 0) {
          this.lines.lineBetween(rightLeft, rowTop, right, rowTop);
        }
      });
    }
  }

  private buildRightFields(data: LabelInfoData): string[] {
    const fields = [
      data.author,
      data.year,
      data.dimensions,
      data.medium,
      data.place,
    ].filter((value): value is string => Boolean(value?.trim()));

    return fields;
  }

  private ensureRightTextCount(count: number) {
    while (this.rightTexts.length < count) {
      const text = this.scene.add
        .text(0, 0, "", {
          fontFamily: "Inter",
          fontSize: "22px",
          fontStyle: "bold",
          color: "#000000",
          wordWrap: { width: 280, useAdvancedWrap: true },
          lineSpacing: 4,
        })
        .setOrigin(0, 0.5);
      this.rightTexts.push(text);
      this.add(text);
    }

    this.rightTexts.forEach((text, index) => {
      text.setVisible(index < count);
    });
  }

  private resetDescriptionScroll() {
    this.descScrollY = 0;
    this.descText.setY(this.descArea.y);
  }

  private scrollDescription(delta: number) {
    if (!this._isVisible) return;

    const maxScroll = Math.max(0, this.descText.height - this.descArea.height);

    this.descScrollY = Phaser.Math.Clamp(
      this.descScrollY + delta,
      -maxScroll,
      0,
    );
    this.descText.setY(this.descArea.y + this.descScrollY);
  }

  private onWheel(_pointer: Phaser.Input.Pointer, _dx: number, dy: number) {
    if (!this._isVisible) return;
    this.scrollDescription(-dy * 0.6);
  }

  public override destroy(fromScene?: boolean) {
    this.scene.input.off("wheel", this.onWheel, this);
    super.destroy(fromScene);
  }
}
