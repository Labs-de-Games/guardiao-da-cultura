import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import { BasePanel } from "./BasePanel";

/**
 * Overlay que exibe o tutorial do modo de inspeção (SHIFT).
 */
export class TutorialOverlay extends BasePanel {
  private title: Phaser.GameObjects.Text;
  private image: Phaser.GameObjects.Image;
  private bodyText: Phaser.GameObjects.Text;
  private escHint: Phaser.GameObjects.Text;
  private onEscHandler?: (event: KeyboardEvent) => void;

  public hasBeenShown: boolean = false;

  private readonly panelW = 980;
  private readonly panelH = 560;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.TUTORIAL);

    this.bg = scene.add.rectangle(
      0,
      0,
      this.panelW,
      this.panelH,
      0x000000,
      0.85,
    );
    this.bg.setStrokeStyle(4, 0xffffff, 0.85);

    this.title = scene.add
      .text(0, 0, "Modo inspecionar", {
        fontSize: "44px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.image = scene.add.image(0, 0, "inspect_example").setOrigin(0.5, 0);

    this.bodyText = scene.add
      .text(
        0,
        0,
        "Use a tecla '⇧' (SHIFT) para entrar no modo inspecionar. Nesse modo, você conseguirá interagir com as relíquias presentes no museu.",
        {
          fontSize: "28px",
          color: LayoutConfig.COLORS.WHITE,
          align: "center",
          lineSpacing: 10,
          wordWrap: { width: this.panelW - 140, useAdvancedWrap: true },
        },
      )
      .setOrigin(0.5, 0);

    this.escHint = scene.add
      .text(0, 0, "ESC para fechar", {
        fontSize: "22px",
        color: LayoutConfig.COLORS.DANGER_RED,
      })
      .setOrigin(0, 1);

    this.add([this.bg, this.title, this.image, this.bodyText, this.escHint]);
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);

    const bw = this.bg.width;
    const bh = this.bg.height;

    this.title.setPosition(0, -bh / 2 + 26);

    const imageTopY = -bh / 2 + 105;
    this.image.setPosition(0, imageTopY);

    const maxImageW = bw - 180;
    const maxImageH = 260;
    const scale = Math.min(
      maxImageW / this.image.width,
      maxImageH / this.image.height,
      1,
    );
    this.image.setScale(scale);

    const textY = imageTopY + (this.image.displayHeight + 26);
    this.bodyText.setPosition(0, textY);

    this.escHint.setPosition(-bw / 2 + 46, bh / 2 - 26);
  }

  public override show() {
    if (this._isVisible) return;
    super.show();
    this.hasBeenShown = true;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.INSPECT_TUTORIAL_OPENED);

    this.onEscHandler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "escape") {
        this.hide();
      }
    };
    this.scene.input.keyboard?.on("keydown", this.onEscHandler);
  }

  public override hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.INSPECT_TUTORIAL_CLOSED);

    if (this.onEscHandler) {
      this.scene.input.keyboard?.off("keydown", this.onEscHandler);
    }

    super.hide(duration, onComplete);
  }
}
