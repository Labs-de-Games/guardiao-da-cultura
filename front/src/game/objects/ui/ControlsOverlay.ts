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

  private readonly panelW = 980;
  private readonly panelH = 420;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.setDepth(LayoutConfig.UI.DEPTHS.CONTROLS);

    this.bg = this.createStandardBg(this.panelW, this.panelH);
    this.bg.setOrigin(...LayoutConfig.ALIGN.CENTER);

    this.title = scene.add
      .text(0, 0, "Controles", {
        fontFamily: LayoutConfig.FONTS.TITLE,
        fontSize: LayoutConfig.FONTS.SIZES.TITLE_LARGE,
        color: LayoutConfig.COLORS.WHITE,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.TOP_CENTER);

    this.bodyText = scene.add
      .text(
        0,
        0,
        "WASD ou SETAS: andar\n" +
          "E: interagir\n" +
          "SHIFT: modo inspecionar\n" +
          "TAB: abrir o mapa das relíquias\n" +
          "Q: ver novamente os controles\n" +
          "B: abrir painel de badges",
        {
          fontFamily: LayoutConfig.FONTS.BODY,
          fontSize: LayoutConfig.FONTS.SIZES.BODY,
          color: LayoutConfig.COLORS.WHITE,
          align: LayoutConfig.ALIGN.TEXT_LEFT,
          lineSpacing: 10,
          wordWrap: { width: this.panelW - 140, useAdvancedWrap: true },
        },
      )
      .setOrigin(...LayoutConfig.ALIGN.TOP_CENTER);

    this.escHint = this.createKeyHint("Aperte ESC para fechar");
    this.escHint.setOrigin(...LayoutConfig.ALIGN.BOTTOM_LEFT);

    this.add([this.bg, this.title, this.bodyText, this.escHint]);

    this.bindKey("ESC", () => this.hide());
  }

  public layout(w: number, h: number) {
    this.setPosition(w / 2, h / 2);
    this.title.setPosition(0, -this.bg.height / 2 + 26);
    this.bodyText.setPosition(0, -this.bg.height / 2 + 110);
    this.escHint.setPosition(-this.bg.width / 2 + 46, this.bg.height / 2 - 26);

    this.applyScaledFontSize(
      this.title,
      LayoutConfig.FONTS.SIZES.TITLE_LARGE,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.bodyText,
      LayoutConfig.FONTS.SIZES.BODY,
      w,
      h,
    );
    this.applyScaledFontSize(
      this.escHint,
      LayoutConfig.FONTS.SIZES.METADATA,
      w,
      h,
    );
  }

  public override show() {
    if (this._isVisible) return;
    super.show();

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.CONTROLS_OVERLAY_OPENED);
  }

  public override hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;

    const gameScene = this.scene.scene.get(SceneNames.GAME);
    gameScene.events.emit(GameEvents.CONTROLS_OVERLAY_CLOSED);

    super.hide(duration, onComplete);
  }
}
