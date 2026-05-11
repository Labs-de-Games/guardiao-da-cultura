import * as Phaser from "phaser";
import { LayoutConfig } from "../../constants/LayoutConfig";

/**
 * BasePanel é uma classe base abstrata para todos os componentes de UI da UIScene.
 * Fornece funcionalidades comuns de visibilidade, animação, contrato de layout e input.
 */
export abstract class BasePanel extends Phaser.GameObjects.Container {
  protected _isVisible: boolean = false;
  protected bg!: Phaser.GameObjects.Rectangle;
  private keyListeners: { key: string; fn: () => void }[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.setVisible(false);
    this.setAlpha(0);
    scene.add.existing(this);
  }

  /** Contrato para reposicionamento responsivo */
  abstract layout(width: number, height: number): void;

  protected getFontScale(width: number, height: number): number {
    return Math.min(width / 1920, height / 1080);
  }

  protected applyScaledFontSize(
    text: Phaser.GameObjects.Text,
    baseSize: number,
    width: number,
    height: number,
  ): void {
    text.setFontSize(Math.round(baseSize * this.getFontScale(width, height)));
  }

  /** Fábrica Visual: Cria fundo padrão do sistema */
  protected createStandardBg(
    width: number,
    height: number,
    depth: number = 0,
  ): Phaser.GameObjects.Rectangle {
    const bg = this.scene.add.rectangle(
      0,
      0,
      width,
      height,
      LayoutConfig.COLORS.STANDARD_BG,
      0.95,
    );
    bg.setStrokeStyle(
      LayoutConfig.UI.PANEL_BORDER_WIDTH,
      LayoutConfig.UI.PANEL_BORDER_COLOR,
      1,
    );
    bg.setOrigin(...LayoutConfig.ALIGN.TOP_CENTER);
    bg.setDepth(depth);
    return bg;
  }

  /** Fábrica Visual: Cria dica de tecla padronizada */
  protected createKeyHint(
    text: string,
    color: string = LayoutConfig.COLORS.DANGER_RED,
  ): Phaser.GameObjects.Text {
    return this.scene.add
      .text(0, 0, text, {
        fontSize: LayoutConfig.FONTS.SIZES.METADATA,
        color: color,
        fontStyle: LayoutConfig.FONTS.STYLES.BOLD,
      })
      .setOrigin(...LayoutConfig.ALIGN.BOTTOM_CENTER);
  }

  /** Input Manager: Registra tecla no sistema Phaser com cleanup automático */
  protected bindKey(key: string, callback: () => void) {
    const phaserKey = key.toUpperCase();
    this.scene.input.keyboard?.on(`keydown-${phaserKey}`, callback);
    this.keyListeners.push({ key: `keydown-${phaserKey}`, fn: callback });
  }

  private clearKeys() {
    this.keyListeners.forEach((l) => {
      this.scene.input.keyboard?.off(l.key, l.fn);
    });
    this.keyListeners = [];
  }

  /** Métodos de animação padrão */
  public show(duration: number = 160) {
    if (this._isVisible) return;
    this._isVisible = true;
    this.setVisible(true);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: duration,
      ease: "Quad.Out",
    });
  }

  public hide(duration: number = 120, onComplete?: () => void) {
    if (!this._isVisible) return;
    this._isVisible = false;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: duration,
      ease: "Quad.In",
      onComplete: () => {
        this.setVisible(false);
        if (onComplete) onComplete();
      },
    });
  }

  public get isVisible(): boolean {
    return this._isVisible;
  }

  public override destroy(fromScene?: boolean) {
    this.clearKeys();
    super.destroy(fromScene);
  }
}
