import type * as Phaser from "phaser";
import { GameEvents } from "../../constants/GameEvents";
import { LayoutConfig } from "../../constants/LayoutConfig";
import { SceneNames } from "../../constants/SceneNames";
import { BasePanel } from "./BasePanel";

/**
 * Overlay que exibe os controles básicos do jogo.
 * Acionado no início da fase ou pela tecla 'Q'.
 */
export class ControlsOverlay extends BasePanel {
  private title: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private escHint: Phaser.GameObjects.Text;
  private onEscHandler?: (event: KeyboardEvent) => void;

  private readonly panelW = 980;
  private readonly panelH = 420;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.CONTROLS);

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
      .text(0, 0, "Controles", {
        fontSize: "44px",
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0);

    this.bodyText = scene.add
      .text(
        0,
        0,
        "WASD ou SETAS: andar\n" +
          "ESPAÇO: interagir\n" +
          "TAB: abrir o mapa das relíquias\n" +
          "Q: ver novamente os controles",
        {
          fontSize: "28px",
          color: LayoutConfig.COLORS.WHITE,
          align: "left",
          lineSpacing: 10,
          wordWrap: { width: this.panelW - 140, useAdvancedWrap: true },
        },
      )
      .setOrigin(0.5, 0);

    this.escHint = scene.add
      .text(0, 0, "Aperte ESC para fechar", {
        fontSize: "22px",
        color: LayoutConfig.COLORS.DANGER_RED,
      })
      .setOrigin(0, 1);

    this.add([this.bg, this.title, this.bodyText, this.escHint]);
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
    this.title.setPosition(0, -this.bg.height / 2 + 26);
    this.bodyText.setPosition(0, -this.bg.height / 2 + 110);
    this.escHint.setPosition(-this.bg.width / 2 + 46, this.bg.height / 2 - 26);
  }

  public override show() {
    if (this._isVisible) return;
    super.show();

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.CONTROLS_OVERLAY_OPENED);

    this.onEscHandler = (event: KeyboardEvent) => {
      const isEscape = event.key.toLowerCase() === "escape";
      const isSpace =
        event.code === "Space" || event.key === " " || event.key === "Spacebar";
      if (isEscape || isSpace) {
        this.hide();
      }
    };
    this.scene.input.keyboard?.on("keydown", this.onEscHandler);
  }

  public override hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.CONTROLS_OVERLAY_CLOSED);

    if (this.onEscHandler) {
      this.scene.input.keyboard?.off("keydown", this.onEscHandler);
    }

    super.hide(duration, onComplete);
  }
}
